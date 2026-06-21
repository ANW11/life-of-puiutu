/* Life of Puiutu — service worker
   Strategy: cache-first runtime caching.
   Assets (images, audio, json) are loaded dynamically from JS, so instead of
   pre-listing everything we cache each file the first time it's fetched.
   After playing once, the game works fully offline.                       */

const CACHE = 'puiutu-v1';

// Minimal app shell to cache on install so the game opens offline.
const SHELL = [
  './',
  './life_of_puiutu_game.html',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Only cache successful same-origin responses.
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
