// Service Worker — Financial Tracker PWA
// Cache name includes date — change this on each deploy to bust stale cache
const CACHE_NAME = 'finance-tracker-20260610b';
const STATIC_ASSETS = [
  './index.html',
  './js/app.js',
  './styles/main.css',
  './manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST for local assets (always gets fresh code when online)
// Falls back to cache only when offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always pass through to network for Firebase / CDN / external resources
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('fonts.g')
  ) {
    return;
  }

  // Network-first: try to fetch fresh, update cache, fall back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
  );
});
