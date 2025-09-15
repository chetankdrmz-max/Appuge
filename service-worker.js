// service-worker.js
const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/', // fallback for navigation (GitHub Pages directories may need explicit path)
  '/Smart_FarmHer/', // if you host at /Smart_FarmHer/
  '/Smart_FarmHer/index.html',
  '/Smart_FarmHer/manifest.json',
  '/Smart_FarmHer/icons/icon-192.png',
  '/Smart_FarmHer/icons/icon-512.png',
  // add any main JS/CSS files you want precached (match your file names)
  // '/Smart_FarmHer/style.css',
  // '/Smart_FarmHer/main.js'
];

// INSTALL - precache the app shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: 'reload' }))))
  );
});

// ACTIVATE - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== APP_SHELL_CACHE && k !== RUNTIME_CACHE && k !== IMAGE_CACHE)
        .map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// FETCH - routing strategy
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Don't interfere with non-GET requests
  if (request.method !== 'GET') return;

  // 1) API calls (open-meteo or other JSON) -> network-first, fallback to cache
  if (url.hostname.endsWith('open-meteo.com') || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // 2) Navigation (load index.html) -> network-first then cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(resp => {
          // update cache for shell
          const copy = resp.clone();
          caches.open(APP_SHELL_CACHE).then(cache => cache.put('/Smart_FarmHer/index.html', copy));
          return resp;
        })
        .catch(() => caches.match('/Smart_FarmHer/index.html').then(r => r || caches.match('/Smart_FarmHer/')))
    );
    return;
  }

  // 3) Images & fonts -> cache first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4) All other requests -> try cache, else network
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(networkRes => {
      // optionally store to runtime cache (small)
      return networkRes;
    }).catch(() => cached))
  );
});

// NETWORK FIRST helper
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

// CACHE FIRST helper
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}

// Optional: listen for messages to skipWaiting from client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
