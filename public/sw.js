const CACHE_NAME = 'divvy-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/globals.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
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

// Push notification event: display notification when push is received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, data: payloadData, tag, url } = data;

    const options = {
      body: body || '',
      icon: icon || '/icons/icon-192x192.svg',
      badge: badge || '/icons/icon-192x192.svg',
      tag: tag || 'divvy-notification',
      data: {
        url: url || '/',
        ...(payloadData || {})
      },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Abrir' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Divvy', options)
    );
  } catch (e) {
    console.error('Error parsing push notification data:', e);
    event.waitUntil(
      self.registration.showNotification('Divvy', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.svg'
      })
    );
  }
});

// Notification click event: handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);

        if (clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname) {
          return client.focus();
        }
      }
      // If no matching window, open a new one
      return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close event (optional, for analytics)
self.addEventListener('notificationclose', (event) => {
  // Could send analytics or tracking here
  console.log('Notification closed:', event.notification.tag);
});
