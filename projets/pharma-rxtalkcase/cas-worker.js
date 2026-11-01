/* Worker « cas-cliniques ». Secrets : APP_SECRET, GEMINI_KEY, MISTRAL_KEY.
   Variable optionnelle MODELS : "google:gemini-3.5-flash-lite,mistral:ministral-14b-latest,…" (remplace la chaîne). */
const API = {
  google:  { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', keys: ['GEMINI_KEY', 'GEMINI_API_KEY'] },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', keys: ['MISTRAL_KEY', 'MISTRAL_API_KEY'] },
};
const CHAIN = [
  ['google', 'gemini-3.5-flash-lite'], ['google', 'gemini-3.1-flash-lite'], ['mistral', 'ministral-14b-latest'],
  ['google', 'gemma-4-31b-it'], ['google', 'gemma-4-26b-a4b-it'],
];
const CORS = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret', 'Access-Control-Expose-Headers': 'X-Model',
};
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const cut = (s, n) => String(s || '').slice(0, n);
const HINT = '(indice demandé)';

const PATIENT = (enonce, hint) => `Tu joues UN PATIENT (ou son accompagnant si la situation concerne un enfant ou une personne dépendante) face à un étudiant en pharmacie qui joue le pharmacien. L'étudiant s'entraîne : laisse-le mener l'entretien.
Règles :
- Reste dans le rôle, en français courant, 1 à 3 phrases, sans vocabulaire médical qu'un patient ne connaîtrait pas : décris les symptômes avec tes mots.
- Le cadre est un entretien pharmaceutique : adapte la situation même si elle décrit un service hospitalier. Tu t'adresses toujours au pharmacien.
- Commence par ta demande ou ta plainte, jamais par le diagnostic ni par la liste de tous tes problèmes.
- Ne donne une information (antécédents, traitements, allergies, durée, résultats) que si l'étudiant la demande ; à une question vague, réponds vaguement. Si on te demande ton ordonnance ou ton bilan, donne le traitement ou les valeurs exactement comme dans la situation.
- N'invente aucune donnée clinique, biologique ou médicamenteuse absente de la situation. Pour un détail de vie banal (prénom, métier), tu peux improviser. Si tu ne sais pas : « je ne sais pas ».
- Ne révèle jamais le diagnostic, ne corrige pas l'étudiant, ne sors pas du rôle, ne suggère pas ce qu'il devrait demander. S'il te donne un conseil faux ou dangereux, réagis comme un patient (doute, incompréhension) sans le reprendre.

SITUATION (connue de toi seul) :
${enonce}${hint ? `\n\nINDICE DEMANDÉ (n°${hint}) : l'étudiant est bloqué. Dans ta prochaine réponse uniquement, lâche spontanément UNE information de la situation qu'il n'a pas encore obtenue (symptôme, antécédent, traitement, détail de l'ordonnance ou du bilan…), comme un patient qui y repense, en 1 à 2 phrases. Indice n°1 : très indirect ; n°2 : plus net ; n°3 et suivants : net. Ne nomme jamais le diagnostic ni la solution.` : ''}`;

const EVAL = (cas, transcript) => `Tu es l'évaluateur d'un entraînement de pharmacie. Ci-dessous : la situation, les questions d'examen associées avec leurs réponses attendues (elles font foi), puis la conversation entre l'étudiant (pharmacien) et le patient simulé.
Fais un débrief en français, précis et honnête, uniquement à partir des réponses attendues et de ce qui a été dit :
**Note : x/20** et une phrase de bilan.
**Bien fait** : ce qui est juste.
**À rechercher ou à corriger** : informations clés non demandées, erreurs, avec la réponse attendue correspondante.
**Conduite attendue** : la décision finale en quelques lignes.
Les lignes « (indice demandé) » sont des demandes d'aide au patient : indique leur nombre et tiens-en compte dans la note. Si la conversation est trop courte pour juger, dis-le. Signale toute information médicale que tu ajoutes hors des réponses attendues.

SITUATION :
${cas.enonce}

QUESTIONS ET RÉPONSES ATTENDUES :
${(cas.questions || []).map((q) => `Q${q.n || ''} ${q.question}\nRéponse attendue : ${q.reponse_modele}`).join('\n\n')}

CONVERSATION :
${transcript}`;

const mergeSystem = (m) => {
  const sys = m.filter((x) => x.role === 'system').map((x) => x.content).join('\n');
  const rest = m.filter((x) => x.role !== 'system');
  if (rest[0]) rest[0] = { ...rest[0], content: sys + '\n\n' + rest[0].content };
  return rest;
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ ok: true, service: 'cas-cliniques' });
    if (!env.APP_SECRET || request.headers.get('X-App-Secret') !== env.APP_SECRET) return json({ error: 'Mot de passe invalide' }, 401);

    let b;
    try { b = await request.json(); } catch { return json({ error: 'JSON invalide' }, 400); }
    const cas = b.cas || {};
    const hist = (Array.isArray(b.messages) ? b.messages : []).slice(-40)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: cut(m.content, 2000) }));
    if (!cas.enonce || !hist.length) return json({ error: 'Cas ou messages manquants' }, 400);

    const evaluate = b.mode === 'eval';
    const messages = evaluate
      ? [{ role: 'user', content: EVAL({ enonce: cut(cas.enonce, 12000), questions: (cas.questions || []).slice(0, 12).map((q) => ({ ...q, reponse_modele: cut(q.reponse_modele, 2500) })) },
          hist.filter((m, i) => i > 0).map((m) => (m.role === 'user' ? 'Pharmacien : ' : 'Patient : ') + m.content).join('\n')) }]
      : [{ role: 'system', content: PATIENT(cut(cas.enonce, 12000), hist[hist.length - 1].content === HINT ? hist.filter((m) => m.content === HINT).length : 0) }, ...hist];

    const chain = env.MODELS ? env.MODELS.split(',').map((s) => s.trim().split(/:(.+)/).slice(0, 2)) : CHAIN;
    const errs = [];
    for (const [p, model] of chain) {
      const api = API[p]; const key = api && api.keys.map((k) => env[k]).find(Boolean);
      if (!key) { errs.push(`${model}: pas de clé`); continue; }
      const body = {
        model, stream: true, temperature: evaluate ? 0.3 : 0.8,
        max_tokens: (evaluate ? 1600 : 400) + (p === 'google' ? 2048 : 0),   // marge pour la réflexion des modèles Google
        messages: /gemma/i.test(model) ? mergeSystem(messages) : messages,
      };
      if (/gemma-4/i.test(model)) body.reasoning_effort = 'none';
      const send = () => fetch(api.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) });
      try {
        let r = await send();
        if (r.status === 400 && body.reasoning_effort) { delete body.reasoning_effort; r = await send(); }
        if (r.ok) return new Response(r.body, { headers: { ...CORS, 'Content-Type': r.headers.get('Content-Type') || 'text/event-stream', 'X-Model': model } });
        errs.push(`${model}: ${r.status}`);
      } catch (e) { errs.push(`${model}: ${e.message}`); }
    }
    return json({ error: 'Aucun modèle disponible', details: errs }, 503);
  },
};
