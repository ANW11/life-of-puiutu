/* Life of Puiutu — service worker
   Strategy: network-first, cache as the fallback.
   Online, every file comes fresh from the server (and the copy in the cache is
   refreshed), so a changed sprite or a new build shows up on the next load.
   Offline, the last copy that was fetched is served instead — after playing
   once, the game still works fully offline.
   (It used to be cache-first, which meant a file, once cached, was never
   fetched again: edits to the game never reached a device that had played it.)
   Bump CACHE to throw away every old copy at once.                         */

const CACHE = 'puiutu-v2';

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
    fetch(req).then((res) => {
      // Only cache successful same-origin responses.
      if (res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))            // offline: the last copy we had
  );
});
