// Service Worker — no caching, always network-fresh
// Every normal refresh loads the latest deployed code.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  // Wipe all existing caches from previous SW versions
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// No fetch handler — browser fetches everything directly from network
