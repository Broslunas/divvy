const CACHE_NAME = 'divvy-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/globals.css'
];

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
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for offline routing could go here
      });
    })
  );
});

// Service worker is now solely used for offline assets caching and push notifications.

// Push notifications events
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
      // If a window with the same path is already open, focus it
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(link, client.url);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })
  );
});
