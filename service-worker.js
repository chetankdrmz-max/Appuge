const CACHE_NAME = 'agri-analyst-shell-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  // don't cache CDN-hosted libraries here (they will be fetched normally).
  // If you later host local copies of CSS/JS, add them here.
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: respond from cache falling back to network
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(networkResp => {
        // Optionally cache same-origin GET responses (uncomment to enable)
        // if (req.url.startsWith(self.location.origin)) {
        //   caches.open(CACHE_NAME).then(cache => cache.put(req, networkResp.clone()));
        // }
        return networkResp;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
