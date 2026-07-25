const CACHE_NAME = 'daniel-nba-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the page itself (index.html / navigations) so every
// update (like the friends-group feature) reaches players on next load,
// even if they visited before. Falls back to cache only when offline.
// Static assets (icons, manifest) stay cache-first since they rarely change.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isNavigation = req.mode === 'navigate' || (req.destination === 'document');
  const isHtml = req.url.endsWith('.html') || req.url.endsWith('/');

  if (isNavigation || isHtml) {
    event.respondWith(
      fetch(req)
        .then((fresh) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, fresh.clone()));
          return fresh;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((fresh) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, fresh.clone()));
        return fresh;
      });
    })
  );
});
