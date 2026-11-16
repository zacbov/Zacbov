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
const CADRES = {
  officine: { role: "UN PATIENT (ou son accompagnant si la situation concerne un enfant ou une personne dépendante) face à un étudiant en pharmacie qui joue le pharmacien d'officine", ton: "Sans vocabulaire médical qu'un patient ne connaîtrait pas : décris les symptômes avec tes mots.", lieu: "Le cadre est un entretien au comptoir de l'officine : adapte la situation même si elle décrit un service hospitalier. Tu t'adresses au pharmacien." },
  hospitalier: { role: "UN SOIGNANT (médecin, interne ou infirmier(ère)) du service où se trouve le patient décrit dans la situation ; tu sollicites un étudiant en pharmacie qui joue le pharmacien hospitalier de la pharmacie à usage intérieur", ton: "Vocabulaire professionnel courant, ton bref et factuel, comme un soignant pressé qui connaît le dossier.", lieu: "Le cadre est un service hospitalier : tu appelles ou croises le pharmacien au sujet du traitement ou du dossier de ce patient. Tu connais le dossier (la situation), pas plus." },
  industrie_recherche: { role: "UN COLLÈGUE (médecin investigateur, responsable de pharmacovigilance, de la qualité ou chercheur) qui soumet une situation à un étudiant en pharmacie jouant le pharmacien d'un laboratoire, d'un site industriel ou d'un centre de recherche", ton: "Vocabulaire scientifique et réglementaire courant, ton professionnel.", lieu: "Le cadre est un laboratoire, un site industriel ou un centre de recherche : tu présentes la situation comme un dossier à analyser. Tu connais le dossier (la situation), pas plus." },
};
const DOCS = (c) => (c.docs_etat && c.docs_etat.length ? '\n\nDOCUMENTS DU CAS :\n' + c.docs_etat.map((d) => '- ' + d.titre + ' : ' + (d.ouvert ? "demandé par l'étudiant" : 'jamais demandé')).join('\n') : "\n\nLE CAS NE CONTIENT AUCUN DOCUMENT : n'écris pas la rubrique « Analyse des documents ».") + (c.notes && c.notes.length ? "\n\nANALYSE DES DOCUMENTS PAR L'ÉTUDIANT (ses notes) :\n" + c.notes.map((n) => '- ' + n.doc + ' : ' + n.texte).join('\n') : '');
const FICHE = (f) => {
  if (!f) return '';
  const L = [], add = (k, v) => { if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) L.push(k + ' : ' + (Array.isArray(v) ? v.join(', ') : v)); };
  add('sexe', f.sexe); add('âge', f.age ? f.age + ' ' + (f.age_unite || 'ans') : null); add('poids', f.poids_kg ? f.poids_kg + ' kg' : null); add('taille', f.taille_cm ? f.taille_cm + ' cm' : null);
  add('grossesse', f.grossesse); add('allaitement', f.allaitement); add('allergies', f.allergies); add('traitements connus', f.traitements);
  return L.length ? "\n- FICHE PATIENT (faits établis, ne les contredis pas ; pour tout élément absent de la situation et de cette fiche, dis que tu ne sais pas ou ne t'en souviens pas) : " + L.join(' ; ') : '';
};
const FICHEV = (c) => (c.fiche_saisie && Object.values(c.fiche_saisie).some((v) => String(v).trim()) ? "\n\nFICHE PATIENT REMPLIE PAR L'ÉTUDIANT :\n" + Object.entries(c.fiche_saisie).filter(([, v]) => String(v).trim()).map(([k, v]) => '- ' + k + ' : ' + cut(v, 300)).join('\n') + (c.fiche_ref ? '\nFICHE DE RÉFÉRENCE (extraction automatique, null = non précisé) : ' + cut(JSON.stringify(c.fiche_ref), 800) : '') : '');
const INT = (a) => (a && a.length ? '\n\nINTERACTIONS DU THÉSAURUS ANSM (sept. 2023) entre les médicaments du cas, détectées automatiquement (à vérifier) :\n' + a.slice(0, 8).map((i) => '- ' + (i.entre || []).join(' + ') + ' : ' + (i.niveau || []).join(' / ') + '. ' + cut(i.mecanisme, 300) + ' Conduite : ' + cut(i.conduite, 300)).join('\n') : '');
const PROFILS = {
  presse: "Tu es pressé : réponses courtes, tu regardes l'heure, tu t'impatientes si l'entretien s'allonge, mais tu réponds si on insiste poliment.",
  bavard: "Tu es bavard : tu digresses sur ta vie (famille, voisins) avant de répondre ; l'information utile est noyée mais tu la donnes si on te recentre.",
  anxieux: "Tu es anxieux : tu t'inquiètes, tu imagines le pire et tu poses des questions sur les risques ; un ton rassurant t'aide à répondre précisément.",
  observance: "Tu suis mal ton traitement : tu oublies des prises ou en as arrêté sans le dire. Tu ne l'avoues que si on te le demande sans jugement, en termes vagues (« je prends ça quand j'y pense »), sans inventer de nouvelle donnée clinique.",
};
const LIGHT = (mode, cas, hist) => mode === 'checklist'
  ? `Situation :\n${cut(cas.enonce, 12000)}\n\nRéponses attendues :\n${(cas.questions || []).slice(0, 12).map((q) => cut(q.reponse_modele, 1500)).join('\n')}${INT(cas.interactions)}\n\nListe 6 à 10 informations clés que le pharmacien doit obtenir du patient en l'interrogeant (symptômes, antécédents, traitements, allergies, contexte), jamais des conclusions ni le diagnostic. Réponds uniquement par un tableau JSON de chaînes courtes.`
  : `POINTS :\n${(cas.points || []).map((p, i) => (i + 1) + '. ' + cut(p, 200)).join('\n')}\n\nCONVERSATION :\n${hist.filter((m, i) => i > 0).map((m) => (m.role === 'user' ? 'Pharmacien : ' : (cas.pop && cas.pop !== 'officine' ? 'Interlocuteur : ' : 'Patient : ')) + m.content).join('\n')}\n\nRéponds uniquement par un tableau JSON des numéros des points dont l'information a clairement été obtenue (question du pharmacien ou indice demandé).`;

const PATIENT = (enonce, hint, docs, profil, pop, fiche) => `Tu joues ${(CADRES[pop] || CADRES.officine).role}. L'étudiant s'entraîne : laisse-le mener l'entretien.
Règles :
- Reste dans le rôle, en français, 1 à 3 phrases. ${(CADRES[pop] || CADRES.officine).ton}
- ${(CADRES[pop] || CADRES.officine).lieu}
- Commence par ta demande ou ta plainte, jamais par le diagnostic ni par la liste de tous tes problèmes.
- Ne donne une information (antécédents, traitements, allergies, durée, résultats) que si l'étudiant la demande ; à une question vague, réponds vaguement. Si on te demande ton ordonnance ou ton bilan, donne le traitement ou les valeurs exactement comme dans la situation.
- N'invente aucune donnée clinique, biologique ou médicamenteuse absente de la situation. Pour un détail de vie banal (prénom, métier), tu peux improviser. Si tu ne sais pas : « je ne sais pas ».
- Ne révèle jamais le diagnostic, ne corrige pas l'étudiant, ne sors pas du rôle, ne suggère pas ce qu'il devrait demander. S'il te donne un conseil faux ou dangereux, réagis comme un patient (doute, incompréhension) sans le reprendre.${docs && docs.length ? "\n- Tu as sur toi ces documents : " + docs.join(', ') + ". Tu peux dire de vive voix ce qu'ils contiennent si on te le demande, mais tu ne les tends que si l'étudiant te les demande explicitement (le dossier pharmaceutique ne s'ouvre que si l'étudiant te demande ton accord pour l'ouvrir). Quand tu en tends un, termine ta phrase par la balise [DOC:nom exact] (exemples : [DOC:Hémogramme], [DOC:Ordonnance]). Sans demande explicite, n'ajoute jamais de balise." : "\n- Tu n'as aucun document sur toi. Si on te demande ton ordonnance ou des résultats, dis ce que tu en sais de vive voix sans prétendre tendre un papier. N'invente aucun nom de médicament ni aucune valeur absents de la situation : si l'énoncé n'en cite pas, dis que tu ne t'en souviens pas."}${PROFILS[profil] ? '\n- PROFIL (comportement uniquement, sans changer les faits de la situation) : ' + PROFILS[profil] : ''}${FICHE(fiche)}

SITUATION (connue de toi seul) :
${enonce}${hint ? `\n\nINDICE DEMANDÉ (n°${hint}) : l'étudiant est bloqué. Dans ta prochaine réponse uniquement, lâche spontanément UNE information de la situation qu'il n'a pas encore obtenue (symptôme, antécédent, traitement, détail de l'ordonnance ou du bilan…), comme un patient qui y repense, en 1 à 2 phrases. Indice n°1 : très indirect ; n°2 : plus net ; n°3 et suivants : net. Ne nomme jamais le diagnostic ni la solution.` : ''}`;

const EVAL = (cas, transcript) => `Tu es l'évaluateur d'un entraînement de pharmacie. Ci-dessous : la situation, les questions d'examen associées avec leurs réponses attendues (elles font foi). IMPORTANT : l'étudiant n'a jamais vu ces questions et n'avait pas à y répondre ; elles servent de référence sur ce qu'un bon pharmacien devait établir, savoir et conseiller. Ne le note donc pas sur ces questions : note la consultation (informations utiles obtenues, justesse de ses propos et conseils par rapport à ces réponses, décision, documents). Une consultation courte mais juste n'est pas à 0. Termine par une rubrique **Connaissances du cas non mobilisées** tirée des réponses attendues. Puis la conversation entre l'étudiant (pharmacien) et le patient simulé.
Fais un débrief en français, précis et honnête, uniquement à partir des réponses attendues et de ce qui a été dit :
**Note : x/20** et une phrase de bilan.
**Bien fait** : ce qui est juste.
**À rechercher ou à corriger** : informations clés non demandées, erreurs, avec la réponse attendue correspondante.
**Conduite attendue** : la décision finale en quelques lignes.
**Fiche patient** : exactitude et complétude de la fiche remplie par l'étudiant par rapport à la fiche de référence (si fournie).
**Analyse des documents** : justesse de l'interprétation de l'étudiant, et documents déterminants jamais demandés (si le cas en contient).
Les lignes « (indice demandé) » sont des demandes d'aide au patient : indique leur nombre et tiens-en compte dans la note. Si la conversation est trop courte pour juger, dis-le. Signale toute information médicale que tu ajoutes hors des réponses attendues.

SITUATION :
${cas.enonce}

QUESTIONS ET RÉPONSES ATTENDUES :
${(cas.questions || []).map((q) => `Q${q.n || ''} ${q.question}\nRéponse attendue : ${q.reponse_modele}`).join('\n\n')}${FICHEV(cas)}${DOCS(cas)}${INT(cas.interactions)}${cas.points && cas.points.length ? '\n\nPOINTS CLÉS À OBTENIR (checklist) :\n' + cas.points.map((p, i) => (i + 1) + '. ' + p).join('\n') : ''}

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
    const cas = b.cas || {}; cas.pop = b.pop;
    const hist = (Array.isArray(b.messages) ? b.messages : []).slice(-40)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: cut(m.content, 2000) }));
    if (!cas.enonce || !hist.length) return json({ error: 'Cas ou messages manquants' }, 400);

    const evaluate = b.mode === 'eval';
    const light = b.mode === 'cover' || b.mode === 'checklist';
    const messages = light ? [{ role: 'user', content: LIGHT(b.mode, cas, hist) }] : evaluate
      ? [{ role: 'user', content: EVAL({ enonce: cut(cas.enonce, 12000), points: (cas.points || []).slice(0, 12).map((p) => cut(p, 200)), interactions: (cas.interactions || []).slice(0, 8), fiche_saisie: cas.fiche_saisie || null, fiche_ref: cas.fiche_ref || null, notes: (cas.notes || []).slice(0, 12).map((n) => ({ doc: cut(n.doc, 60), texte: cut(n.texte, 1500) })), docs_etat: (cas.docs_etat || []).slice(0, 20).map((d) => ({ titre: cut(d.titre, 60), ouvert: !!d.ouvert })), questions: (cas.questions || []).slice(0, 12).map((q) => ({ ...q, reponse_modele: cut(q.reponse_modele, 2500) })) },
          hist.filter((m, i) => i > 0).map((m) => (m.role === 'user' ? 'Pharmacien : ' : (cas.pop && cas.pop !== 'officine' ? 'Interlocuteur : ' : 'Patient : ')) + m.content).join('\n')) }]
      : [{ role: 'system', content: PATIENT(cut(cas.enonce, 12000), hist[hist.length - 1].content === HINT ? hist.filter((m) => m.content === HINT).length : 0, Array.isArray(cas.docs) ? cas.docs.slice(0, 12).map((d) => cut(d, 60)) : [], b.profil, b.pop, cas.fiche) }, ...hist];

    const chain = env.MODELS ? env.MODELS.split(',').map((s) => s.trim().split(/:(.+)/).slice(0, 2)) : light ? [CHAIN[4], CHAIN[3]] : CHAIN;
    const errs = [];
    for (const [p, model] of chain) {
      const api = API[p]; const key = api && api.keys.map((k) => env[k]).find(Boolean);
      if (!key) { errs.push(`${model}: pas de clé`); continue; }
      const body = {
        model, stream: !light, temperature: light ? 0.1 : evaluate ? 0.3 : 0.8,
        max_tokens: (light ? 700 : evaluate ? 1600 : 400) + (p === 'google' ? 2048 : 0),   // marge pour la réflexion des modèles Google
        messages: /gemma/i.test(model) ? mergeSystem(messages) : messages,
      };
      if (/gemma-4/i.test(model)) body.reasoning_effort = 'none';
      else if (p === 'google' && !evaluate && !light) body.reasoning_effort = 'low';
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
