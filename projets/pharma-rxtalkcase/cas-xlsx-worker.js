/* Lecture du classeur hors du fil principal (la page reste fluide pendant l'analyse, ~2 s pour 1 900 cas) et mémoire
   des cas déjà analysés dans IndexedDB : tant que le classeur n'a pas changé (ETag / date / taille), il n'est pas relu. */
const ouvrirBase = () => new Promise((ok, ko) => {
  const r = indexedDB.open('cas-cliniques', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('classeurs');
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
const lire = (db, k) => new Promise((ok) => { try { const q = db.transaction('classeurs').objectStore('classeurs').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); } catch { ok(null); } });
const ecrire = (db, k, v) => new Promise((ok) => { try { const t = db.transaction('classeurs', 'readwrite'); t.objectStore('classeurs').put(v, k); t.oncomplete = () => ok(); t.onerror = () => ok(); } catch { ok(); } });

self.onmessage = async ({ data: { url, xlsx, lecteur } }) => {
  try {
    const t0 = performance.now();
    const r = await fetch(url, { cache: 'no-cache' });          // revalidation : 304 si inchangé, aucun nouveau téléchargement
    if (!r.ok) throw new Error(url + ' : ' + r.status);
    const cle = [r.headers.get('ETag'), r.headers.get('Last-Modified'), r.headers.get('Content-Length')].join('|');
    let db = null; try { db = await ouvrirBase(); } catch {}
    const prec = db && cle !== '||' ? await lire(db, url) : null;
    if (prec && prec.cle === cle) return self.postMessage({ ok: true, d: prec.d, ms: Math.round(performance.now() - t0), memoire: true });
    const buf = await r.arrayBuffer();
    importScripts(xlsx, lecteur);
    const d = self.CasXlsx.lireClasseur(self.XLSX, new Uint8Array(buf));
    if (db && cle !== '||') await ecrire(db, url, { cle, d });
    self.postMessage({ ok: true, d, ms: Math.round(performance.now() - t0), memoire: false });
  } catch (e) { self.postMessage({ ok: false, erreur: String(e && e.message || e) }); }
};
