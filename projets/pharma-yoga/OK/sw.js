// Service Worker — met en cache l'application (pages + Three.js) pour qu'elle
// démarre même avec un WiFi capricieux.
//
// Les MÉDIAS (musiques, ambiances, vidéos 360°) ne passent volontairement PAS par
// ici : les éléments <audio>/<video> demandent des plages d'octets (requêtes
// Range, réponses 206) que le cache du Service Worker gère mal, et ces fichiers
// sont lourds. Le cache HTTP normal du navigateur s'en occupe très bien.
const CACHE_NAME = 'respire-v7';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './battement.html',
  './manifest.json',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url).catch((e) => console.warn('Non mis en cache:', url, e))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const MEDIA_RE = /\.(mp3|ogg|wav|m4a|webm|mp4|mov)(\?|$)/i;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;
  if (req.method !== 'GET') return;                       // HEAD/PUT/DELETE : le navigateur gère
  if (req.headers.has('range') || MEDIA_RE.test(url)) return; // médias : pas de SW
  const isSameOrigin = url.startsWith(self.location.origin);
  const isUnpkg = url.startsWith('https://unpkg.com');
  if (!isSameOrigin && !isUnpkg) return;                  // Firebase, etc. : jamais interceptés

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return response;
      }).catch(() => new Response('', { status: 504, statusText: 'Network error (Service Worker)' }));
    })
  );
});
