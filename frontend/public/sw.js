// Fortune Tiles Service Worker v4.0.0 - Phase 4 Advanced PWA
// Real-time updates, intelligent caching, offline-first architecture
const CACHE_NAME = 'fortune-tiles-v4.0.0';
const SW_VERSION = 'v4.0.0';
const DATA_CACHE_NAME = 'fortune-tiles-data-v4.0.0';
const BACKGROUND_SYNC_TAG = 'background-sync-v1';

// Static assets to cache with intelligent prioritization
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/static/css/main.css'
];

const IMPORTANT_ASSETS = [
  '/static/js/bundle.js',
  '/static/js/vendor.js',
  '/static/js/common.js'
];

const WEBP_IMAGES = [
  '/static/media/logo-fortune-tiles.webp',
  '/static/media/tiles-hero.webp',
  '/static/media/spanish-tiles-preview.webp',
  '/static/media/italian-tiles-preview.webp',
  '/static/media/moroccan-tiles-preview.webp',
  '/static/media/ceramic-tiles-preview.webp'
];

const FALLBACK_IMAGES = [
  '/static/media/logo-fortune-tiles.png',
  '/static/media/default-tile.png'
];

// Performance thresholds for intelligent caching
const CACHE_STRATEGIES = {
  CRITICAL: { maxAge: 86400000, strategy: 'cache-first' }, // 24 hours
  STATIC: { maxAge: 604800000, strategy: 'cache-first' },  // 7 days
  API: { maxAge: 300000, strategy: 'network-first' },      // 5 minutes
  IMAGES: { maxAge: 2592000000, strategy: 'cache-first' }  // 30 days
};

// Background sync queue for offline operations
let syncQueue = [];
const MAX_SYNC_QUEUE_SIZE = 100;

// API endpoints that should be cached (read-only operations)
const API_CACHE_URLS = [
  '/api/dashboard/stats',
  '/api/products?limit=50',
  '/api/locations'
];

self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing:', SW_VERSION);

  event.waitUntil(
    Promise.all([
      // Cache critical assets first for faster initial load
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching critical assets...');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      
      // Cache important assets in background
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching important assets...');
        return cache.addAll(IMPORTANT_ASSETS).catch(err => {
          console.warn('Some important assets failed to cache:', err);
        });
      }),

      // Initialize data cache
      caches.open(DATA_CACHE_NAME).then(() => {
        console.log('💾 Data cache initialized');
      })
    ]).catch((error) => {
      console.error('❌ Cache installation failed:', error);
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating:', SW_VERSION);

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Initialize background sync if available
      self.registration.sync ? Promise.resolve() : Promise.resolve(),

      // Preload critical resources in background
      preloadCriticalResources()
    ])
  );

  self.clients.claim();
});

// Preload critical resources for better performance
async function preloadCriticalResources() {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Preload WebP images if not already cached
    const preloadPromises = WEBP_IMAGES.map(async (url) => {
      const response = await cache.match(url);
      if (!response) {
        return fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response.clone());
          }
        }).catch(() => {}); // Ignore failures
      }
    });

    await Promise.all(preloadPromises);
    console.log('✅ Critical resources preloaded');
  } catch (error) {
    console.warn('⚠️ Preload failed:', error.message);
  }
}

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

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    console.log('🔄 Background sync triggered');
    event.waitUntil(processBackgroundSync());
  }
});

// Process queued operations during background sync
async function processBackgroundSync() {
  console.log(`📤 Processing ${syncQueue.length} queued operations`);
  
  const processedItems = [];
  
  for (const item of syncQueue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });

      if (response.ok) {
        processedItems.push(item);
        console.log('✅ Synced operation:', item.url);
        
        // Invalidate related cache
        await invalidateRelatedCache({ url: item.url });
        
        // Notify client of success
        await notifyClients({
          type: 'sync-success',
          operation: item,
          timestamp: Date.now()
        });
      } else {
        console.warn('⚠️ Sync failed for:', item.url, response.status);
      }
    } catch (error) {
      console.error('❌ Sync error for:', item.url, error.message);
    }
  }

  // Remove successfully processed items
  syncQueue = syncQueue.filter(item => !processedItems.includes(item));
  
  console.log(`✅ Background sync completed. ${syncQueue.length} items remaining.`);
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'GET_CACHE_STATUS':
      handleCacheStatusRequest(event);
      break;
      
    case 'CLEAR_CACHE':
      handleClearCacheRequest(event, data);
      break;
      
    case 'PRELOAD_ROUTES':
      handlePreloadRoutes(event, data);
      break;
      
    case 'SYNC_STATUS':
      event.ports[0]?.postMessage({
        syncQueueLength: syncQueue.length,
        syncSupported: !!self.registration.sync
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

// Cache status handler
async function handleCacheStatusRequest(event) {
  try {
    const [staticCache, dataCache] = await Promise.all([
      caches.open(CACHE_NAME),
      caches.open(DATA_CACHE_NAME)
    ]);

    const [staticKeys, dataKeys] = await Promise.all([
      staticCache.keys(),
      dataCache.keys()
    ]);

    const status = {
      version: SW_VERSION,
      staticCacheSize: staticKeys.length,
      dataCacheSize: dataKeys.length,
      syncQueueLength: syncQueue.length,
      lastUpdate: Date.now()
    };

    event.ports[0]?.postMessage(status);
  } catch (error) {
    event.ports[0]?.postMessage({ error: error.message });
  }
}

// Clear cache handler
async function handleClearCacheRequest(event, data) {
  try {
    const { cacheType = 'all' } = data || {};
    
    if (cacheType === 'all' || cacheType === 'static') {
      await caches.delete(CACHE_NAME);
    }
    
    if (cacheType === 'all' || cacheType === 'data') {
      await caches.delete(DATA_CACHE_NAME);
    }

    event.ports[0]?.postMessage({ success: true, cleared: cacheType });
  } catch (error) {
    event.ports[0]?.postMessage({ success: false, error: error.message });
  }
}

// Preload routes for better performance
async function handlePreloadRoutes(event, data) {
  try {
    const { routes = [] } = data || {};
    const cache = await caches.open(CACHE_NAME);
    
    const preloadPromises = routes.map(async (route) => {
      try {
        const response = await fetch(route);
        if (response.ok) {
          await cache.put(route, response);
          return { route, success: true };
        }
        return { route, success: false, status: response.status };
      } catch (error) {
        return { route, success: false, error: error.message };
      }
    });

    const results = await Promise.all(preloadPromises);
    event.ports[0]?.postMessage({ results });
  } catch (error) {
    event.ports[0]?.postMessage({ error: error.message });
  }
}

// Notify all clients of updates
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Performance monitoring
self.addEventListener('activate', () => {
  // Report performance metrics
  if ('performance' in self) {
    setTimeout(() => {
      notifyClients({
        type: 'sw-performance',
        metrics: {
          swActivationTime: performance.now(),
          version: SW_VERSION
        }
      });
    }, 1000);
  }
});

console.log('🎯 Advanced PWA Service Worker loaded:', SW_VERSION);
