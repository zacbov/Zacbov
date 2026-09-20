// Service Worker — met en cache les fichiers nécessaires pour un fonctionnement
// 100% hors-ligne après la première visite. Cette app n'a aucun asset lourd
// (pas d'image/vidéo/modèle 3D à charger) : tout est généré par code
// (dégradé de ciel, sphère, carillon), donc le cache reste très léger.
const CACHE_NAME = 'respire-v5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './battement.html',
  './manifest.json',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js',
  'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((e) => console.warn('Non mis en cache:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isSameOrigin = url.startsWith(self.location.origin);
  const isUnpkg = url.startsWith('https://unpkg.com');
  if (!isSameOrigin && !isUnpkg) return; // laisse le navigateur gérer nativement le reste

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 504, statusText: 'Network error (Service Worker)' }));
    })
  );
});
