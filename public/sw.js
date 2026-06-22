const CACHE_NAME = 'divvy-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/app',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/globals.css'
];

// API routes that we serve with a Network-First strategy (fall back to cache)
const API_CACHE_PATTERNS = [
  /^\/api\/groups$/,
  /^\/api\/groups\/[^/]+$/,
];

// Separate cache name for API responses
const API_CACHE_NAME = 'divvy-api-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// ── Fetch handler ─────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;

  // Network-First for GET API routes we want to cache
  if (
    request.method === 'GET' &&
    API_CACHE_PATTERNS.some((pattern) => pattern.test(pathname))
  ) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Skip non-GET requests entirely (they are handled by the app / sync queue)
  if (request.method !== 'GET') return;

  // Cache-First with network fallback for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => {
        // No cached match and network failed — nothing we can do for static assets
      });
    })
  );
});

/**
 * Network-First strategy for API GET requests.
 * On success: update the API cache and return the fresh response.
 * On failure (offline): serve from the API cache if available.
 */
async function networkFirstAPI(request) {
  try {
    const networkResponse = await fetch(request.clone());

    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request, { cacheName: API_CACHE_NAME });
    if (cached) return cached;

    // Nothing in cache either — return an offline placeholder response
    return new Response(
      JSON.stringify({ error: 'offline', cached: false }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'divvy-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

/**
 * Sends a message to all open app windows so the foreground hook
 * (useOfflineSync) processes the IndexedDB queue.
 */
async function notifyClientsToSync() {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ type: 'DIVVY_SYNC' });
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Divvy';
    const options = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: {
        link: data.link || '/'
      },
      vibrate: [100, 50, 100]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error in service worker push listener:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(link, client.url);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
