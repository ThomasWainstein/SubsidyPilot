/**
 * Service Worker for offline caching and enhanced user experience
 */

const CACHE_NAME = 'agritool-v1';
const STATIC_CACHE = 'agritool-static-v1';
const API_CACHE = 'agritool-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/search',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/subsidies',
  '/rest/v1/subsidies',
  '/rest/v1/subsidies_structured'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_THEN_NETWORK: 'cache-then-network',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then(cache => {
        console.log('[SW] API cache initialized');
        return cache;
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return cacheName !== STATIC_CACHE && 
                   cacheName !== API_CACHE && 
                   cacheName !== CACHE_NAME;
          })
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - handle caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  event.respondWith(handleRequest(request, url));
});

/**
 * Handle different types of requests with appropriate caching strategies
 */
async function handleRequest(request, url) {
  // Static assets - cache first
  if (isStaticAsset(url)) {
    return handleCacheFirst(request, STATIC_CACHE);
  }
  
  // API requests - network first with cache fallback  
  if (isAPIRequest(url)) {
    return handleNetworkFirst(request, API_CACHE);
  }
  
  // Subsidy detail pages - cache first with network update
  if (isSubsidyPage(url)) {
    return handleCacheFirst(request, CACHE_NAME);
  }
  
  // Other pages - network first
  return handleNetworkFirst(request, CACHE_NAME);
}

/**
 * Cache first strategy
 */
async function handleCacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      
      // Update cache in background for HTML pages
      if (request.headers.get('accept')?.includes('text/html')) {
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {
          // Ignore background update errors
        });
      }
      
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline - content not available', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

/**
 * Network first strategy with cache fallback
 */
async function handleNetworkFirst(request, cacheName) {
  try {
    console.log('[SW] Network first:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return createOfflinePage();
    }
    
    throw error;
  }
}

/**
 * Check if request is for static assets
 */
function isStaticAsset(url) {
  return url.pathname.startsWith('/static/') ||
         url.pathname.includes('.js') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.woff') ||
         url.pathname.includes('.png') ||
         url.pathname.includes('.jpg') ||
         url.pathname.includes('.svg');
}

/**
 * Check if request is for API
 */
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/rest/v1/') ||
         url.hostname.includes('supabase.co');
}

/**
 * Check if request is for subsidy detail page
 */
function isSubsidyPage(url) {
  return url.pathname.startsWith('/subsidy/');
}

/**
 * Create offline page response
 */
function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - AgriTool</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f8fafc;
          color: #334155;
          text-align: center;
          padding: 20px;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }
        h1 {
          margin-bottom: 0.5rem;
          color: #1e293b;
        }
        p {
          margin-bottom: 2rem;
          opacity: 0.8;
          max-width: 400px;
        }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }
        button:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="offline-icon">📱</div>
      <h1>You're Offline</h1>
      <p>This page isn't available offline. Please check your internet connection and try again.</p>
      <button onclick="window.location.reload()">Retry</button>
      
      <script>
        // Auto-retry when online
        window.addEventListener('online', () => {
          window.location.reload();
        });
      </script>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Background sync for form submissions
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processBackgroundSync());
  }
});

/**
 * Process background sync queue
 */
async function processBackgroundSync() {
  try {
    const cache = await caches.open('sync-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
        console.log('[SW] Synced request:', request.url);
      } catch (error) {
        console.error('[SW] Sync failed for:', request.url, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

/**
 * Push notification handling
 */
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'general',
    requireInteraction: false,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action) {
    // Handle action buttons
    clients.openWindow(event.action);
  } else if (event.notification.data?.url) {
    // Handle notification click
    clients.openWindow(event.notification.data.url);
  }
});
