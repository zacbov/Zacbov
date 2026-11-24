/* Lecture du classeur « cas_cliniques_complet.xlsx » (onglets Cas_Cliniques, Questions_Reponses, Documents_Examens,
   Medicaments_Interactions) et reconstruction des cas au format attendu par la page et le worker.
   Le classeur est la source : on y trie, filtre, corrige et désactive des cas (colonne « actif »).
   Colonne « donnees_json » : champs qu'un tableau ne sait pas porter (lames DICOM, liens d'imagerie…) ; elle complète
   la ligne, elle ne la remplace pas pour les colonnes ordinaires. */
(function (root) {
  const vide = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  const txt = (v) => (vide(v) ? null : String(v).trim());
  const num = (v) => { if (vide(v)) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : String(v); };
  const bool = (v) => (vide(v) ? null : v === true || /^(vrai|true|oui|1|x)$/i.test(String(v).trim()) ? true : /^(faux|false|non|0)$/i.test(String(v).trim()) ? false : null);
  const liste = (v, sep = /\s*,\s*/) => (vide(v) ? null : String(v).split(sep).map((s) => s.trim()).filter(Boolean));
  const paires = (v) => {                       // « clé: valeur ; clé: valeur » (texte_ou_details)
    const o = {}; if (vide(v)) return o; let k = null;
    for (const morceau of String(v).split(/ ; (?=[a-z_]+: )/)) { const m = /^([a-z_]+): ([\s\S]*)$/.exec(morceau); if (m) { k = m[1]; o[k] = m[2]; } else if (k) o[k] += ' ; ' + morceau; }
    return o;
  };
  const groupe = (rows, cle) => { const m = new Map(); for (const r of rows) { const k = txt(r[cle]); if (!k) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };

  function documents(rows) {
    const parDoc = new Map();
    for (const r of rows) { const k = String(r.doc_num); if (!parDoc.has(k)) parDoc.set(k, []); parDoc.get(k).push(r); }
    return [...parDoc.entries()].sort((a, b) => num(a[0]) - num(b[0])).map(([, L]) => {
      L.sort((a, b) => num(a.ligne_num) - num(b.ligne_num));
      const r0 = L[0], type = txt(r0.doc_type), d = { type };
      if (txt(r0.doc_titre)) d.titre = txt(r0.doc_titre);
      const det = paires(r0.texte_ou_details);
      if (type === 'bilan') d.lignes = L.map((r) => ({ ech: txt(r.echantillon) || '', analyse: txt(r.analyse_ou_medicament) || '', resultat: txt(r.resultat_ou_posologie) || '', unite: txt(r.unite_ou_duree) || '', ref: txt(r.valeurs_ref) || '' }));
      else if (type === 'dp') d.lignes = L.map((r) => ({ medicament: txt(r.analyse_ou_medicament) || '', substances: txt(r.resultat_ou_posologie) || '' }));
      else if (type === 'ordonnance') {
        d.medecin = det.medecin || ''; d.patient = det.patient || ''; d.date = det.date || '';
        d.lignes = L.map((r) => ({ medicament: txt(r.analyse_ou_medicament) || '', posologie: txt(r.resultat_ou_posologie) || '', duree: txt(r.unite_ou_duree) || '' }));
      } else if (type === 'tableau') {
        if (txt(r0.analyse_ou_medicament)) d.sous_titre = txt(r0.analyse_ou_medicament);
        const cell = (r) => String(r.texte_ou_details || '').split(' | ').map((c) => { const i = c.indexOf(': '); return i < 0 ? ['', c] : [c.slice(0, i), c.slice(i + 2)]; });
        d.colonnes = cell(r0).map((c) => c[0]); d.lignes = L.map((r) => cell(r).map((c) => c[1]));
        if (/^libre: ?(oui|true|vrai|1)$/i.test(txt(r0.unite_ou_duree) || '')) d.libre = true;   // tableau remis d'emblée
      } else Object.assign(d, det);
      if (det.libre !== undefined && d.libre === undefined) d.libre = det.libre;
      d.origine = txt(r0.doc_origine) || '';
      return d;
    });
  }

  function connaissances(rows, origine) {
    const c = { medicaments: [], interactions: [], origine: origine || '' };
    for (const r of rows || []) {
      if (/^médicament/i.test(r.categorie || '')) c.medicaments.push({ terme: txt(r.terme_ou_couple) || '', substances: liste(r.substances_ou_rubrique, /\s*,\s*(?![^()]*\))/) || [] });
      else c.interactions.push({ entre: liste(r.terme_ou_couple, /\s+\+\s+/) || [], rubrique: txt(r.substances_ou_rubrique) || '', niveau: liste(r.niveau_interaction) || [], mecanisme: txt(r.mecanisme) || '', conduite: txt(r.conduite_a_tenir) || '' });
    }
    return c;
  }

  function cas(r, Q, D, M) {
    const c = {
      id: txt(r.id), theme: txt(r.theme_id), specialites: liste(r.specialites, /\s*\|\s*/) || [], apercu: txt(r.apercu) || '', enonce: txt(r.enonce) || '',
      questions: (Q || []).slice().sort((a, b) => num(a.question_ordre) - num(b.question_ordre)).map((q) => ({ n: vide(q.question_numero) ? '' : String(q.question_numero), type: txt(q.question_type) || '', question: txt(q.question) || '', reponse_modele: txt(q.reponse_modele) || '' })),
      indices: { documents_possibles: liste(r.indices_documents_possibles) || [], valeurs_chiffrees: num(r.indices_valeurs_chiffrees) || 0, traitement_nomme: !!bool(r.indices_traitement_nomme), question_verification_traitement: !!bool(r.indices_question_verif_traitement) },
      documents: documents(D || []),
      sources: vide(r.sources_annales) ? [] : String(r.sources_annales).split(/\s*;\s*/).map((s) => { const i = s.indexOf(': '); return { fichier: s.slice(0, i), ids: liste(s.slice(i + 2), /\s*\|\s*/) || [] }; }),
      connaissances: connaissances(M, txt(r.connaissances_origine)),
      pop: txt(r.pop_id), pop_origine: txt(r.pop_origine),
      fiche: { sexe: txt(r.patient_sexe), age: num(r.patient_age), age_unite: txt(r.patient_age_unite), poids_kg: num(r.patient_poids_kg), taille_cm: num(r.patient_taille_cm), grossesse: typeof r.patient_grossesse === 'boolean' ? r.patient_grossesse : txt(r.patient_grossesse), allaitement: typeof r.patient_allaitement === 'boolean' ? r.patient_allaitement : txt(r.patient_allaitement), allergies: txt(r.patient_allergies), traitements: vide(r.patient_traitements_fiche) ? null : / ; /.test(r.patient_traitements_fiche) ? liste(r.patient_traitements_fiche, /\s+;\s+/) : txt(r.patient_traitements_fiche), origine: txt(r.fiche_origine) },
    };
    const opt = { metier: txt(r.metier), a_valider: bool(r.a_valider), corrige: bool(r.corrige), auteurs_corrige: txt(r.auteurs_corrige), extraction_a_relire: bool(r.extraction_a_relire), atlas: txt(r.atlas), decouvrir: txt(r.decouvrir), gestes_attendus: liste(r.gestes_attendus) };
    for (const [k, v] of Object.entries(opt)) if (v !== null) c[k] = v;
    if (!vide(r.fiche_source_nom)) c.fiche_source = { nom: txt(r.fiche_source_nom), type: txt(r.fiche_source_type), niveau: num(r.fiche_source_niveau) };
    if (!vide(r.avatar_plainte) || !vide(r.avatar_emotion)) c.patient = { emotion: txt(r.avatar_emotion) || '', profil: txt(r.avatar_profil) || '', zone: vide(r.avatar_zone_partie) ? null : { partie: txt(r.avatar_zone_partie), cote: txt(r.avatar_zone_cote) }, plainte: txt(r.avatar_plainte) || '', symptomes: liste(r.avatar_symptomes, /\s*\|\s*/) || [] };
    if (!vide(r.constantes_pas) || !vide(r.constantes_pouls)) c.constantes = { pas: num(r.constantes_pas), pad: num(r.constantes_pad), pouls: num(r.constantes_pouls) };
    if (!vide(r.peau_maladie)) c.peau = { maladie: txt(r.peau_maladie), stade: vide(r.peau_stade) ? 1 : num(r.peau_stade) };
    if (!vide(r.visage_cote)) c.visage = { side: txt(r.visage_cote) };
    if (!vide(r.alertes_conseils)) c.alertes_conseils = String(r.alertes_conseils).split(/\n+/).map((l) => /^Si \[([\s\S]*)\] -> ([\s\S]*)$/.exec(l.trim())).filter(Boolean).map((m) => ({ si: m[1], rappel: m[2] }));
    for (const d of c.documents) {                // compte rendu repris de l'énoncé (cas PARHAF) ; « libre : oui » = document remis d'emblée
      if (d.texte === '@enonce') { const m = /COMPTE RENDU :\n([\s\S]*?)\n— fin du compte rendu —/.exec(c.enonce); d.texte = m ? m[1] : c.enonce; }
      if (d.libre !== undefined) d.libre = /^(oui|true|vrai|1)$/i.test(String(d.libre));
    }
    if (!vide(r.donnees_json)) { try { Object.assign(c, JSON.parse(r.donnees_json)); } catch (e) { console.warn('donnees_json illisible pour', c.id, e); } }
    return c;
  }

  /* XLSX : bibliothèque SheetJS ; source : ArrayBuffer du classeur. Retourne { meta, cas, ignores } */
  function lireClasseur(XLSX, source) {
    const wb = XLSX.read(source, { type: 'array' });
    const feuille = (n) => (wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true }) : []);
    const C = feuille('Cas_Cliniques'), Q = groupe(feuille('Questions_Reponses'), 'cas_id'), D = groupe(feuille('Documents_Examens'), 'cas_id'), M = groupe(feuille('Medicaments_Interactions'), 'cas_id');
    const out = [], ignores = [], themes = new Map();
    for (const r of C) {
      if (vide(r.id)) continue;
      if (bool(r.actif) === false) { ignores.push(String(r.id)); continue; }   // décoché dans le classeur : absent de l'outil
      out.push(cas(r, Q.get(String(r.id)), D.get(String(r.id)), M.get(String(r.id))));
      const t = txt(r.theme_id); if (t && !themes.has(t)) themes.set(t, { id: t, libelle: txt(r.theme_libelle) || t, nb_cas: 0 }); if (t) themes.get(t).nb_cas++;
    }
    return { meta: { source: 'classeur', ignores, themes: [...themes.values()], nb_cas: out.length }, cas: out };
  }
  const api = { lireClasseur, _cas: cas };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CasXlsx = api;
})(typeof window !== 'undefined' ? window : globalThis);
