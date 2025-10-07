// Enhanced Service Worker for Fortune Tiles Inventory System
const SW_VERSION = 'fortune-tiles-v3.0';
const CACHE_NAME = `fortune-tiles-cache-${SW_VERSION}`;

// Assets to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/inventory/',
  '/inventory/static/js/main.296c8bbc.js',
  '/inventory/static/css/main.de755aeb.css',
  '/inventory/manifest.json',
  '/inventory/assets/logo.webp',
  '/inventory/assets/logo-circle.png',
  '/inventory/assets/logo.webp'
];

// API endpoints that should be cached (read-only operations)
const API_CACHE_URLS = [
  '/api/dashboard/stats',
  '/api/products?limit=50',
  '/api/locations'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing:', SW_VERSION);
  self.skipWaiting();

  // Pre-cache essential assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets...');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating:', SW_VERSION);

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    // For read-only API calls, try network first, fallback to cache
    if (request.method === 'GET' && (
      url.pathname.includes('/dashboard') ||
      url.pathname.includes('/products') ||
      url.pathname.includes('/locations')
    )) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache if network fails
            return caches.match(request);
          })
      );
    }
    return; // Let other API calls go through normally
  }

  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_URLS.some(staticUrl => url.pathname === staticUrl)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Cache the response for future use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // For navigation requests, serve the app shell
  if (request.mode === 'navigate' && url.pathname.startsWith('/inventory')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If offline, serve the cached app shell
        return caches.match('/inventory/');
      })
    );
    return;
  }

  // Default: network first for other requests
  event.respondWith(
    fetch(request).catch(() => {
      // If offline, try to serve from cache
      return caches.match(request);
    })
  );
});

// Handle background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Placeholder for future offline sync functionality
  console.log('Performing background sync...');
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/inventory/assets/logo-circle.png',
      badge: '/inventory/assets/logo-circle.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow('/inventory/')
  );
});
