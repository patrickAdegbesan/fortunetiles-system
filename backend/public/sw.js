// Minimal service worker to avoid stale asset caching issues
// Version bump to ensure update
const SW_VERSION = 'fortune-tiles-noop-v2';

self.addEventListener('install', (event) => {
  // Activate immediately on install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches and take control
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// No fetch handler means the browser will handle network normally
