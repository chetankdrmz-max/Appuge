const CACHE_NAME = 'smartfarmher-v1';
const ASSETS = [
  '/', // adjust if hosted in subfolder (e.g. '/Smart_FarmHer/')
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // add any CDN assets if you want to cache or leave them dynamic
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Try network first for dynamic content (like fetch PRELOADED_RAW_URL), fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
