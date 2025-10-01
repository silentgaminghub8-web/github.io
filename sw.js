const CACHE_NAME = 'sg-tournaments-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other pages you want to cache
  '/signup.html',
  '/main.html',
  '/ceo.html',
  '/coo.html',
  '/boo.html',
  '/roshi.html',
  '/yt.html',
  '/policy.html',
  '/calculate.html',
  '/profile.html',
  '/tournament.html',
  '/link.html',
  '/goku.html'
];

// External resources to cache
const externalResources = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;800&family=Montserrat:wght@800;900&display=swap',
  'https://ik.imagekit.io/silentgamers/Picsart_25-09-22_00-09-34-964.png?updatedAt=1758480146212&ik-s=4f744f417100daea8710c3389638e583c2987985',
  'https://ik.imagekit.io/silentgamers/logo?updatedAt=1759325329840&ik-s=187e5d55268ffe33c83cef44eb12c5f9dc086cff'
];

// Install event - cache all essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll([...urlsToCache, ...externalResources]);
      })
      .then(() => {
        console.log('All resources cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
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
    }).then(() => {
      console.log('Service Worker activated and old caches cleaned');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('ik.imagekit.io') &&
      !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Performing background sync...');
}

// Periodic update check
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-update') {
    console.log('Periodic sync for content update');
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = [...urlsToCache, ...externalResources];
    
    for (const url of requests) {
      try {
        const networkResponse = await fetch(url, { cache: 'reload' });
        if (networkResponse.ok) {
          await cache.put(url, networkResponse.clone());
          console.log('Updated cache for:', url);
        }
      } catch (error) {
        console.log('Failed to update:', url, error);
      }
    }
    
    // Notify clients about update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CONTENT_UPDATED',
        message: 'New content is available'
      });
    });
  } catch (error) {
    console.log('Update check failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    checkForUpdates();
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update available from SG Tournaments!',
    icon: 'https://ik.imagekit.io/silentgamers/Picsart_25-09-22_00-09-34-964.png?updatedAt=1758480146212&ik-s=4f744f417100daea8710c3389638e583c2987985',
    badge: 'https://ik.imagekit.io/silentgamers/Picsart_25-09-22_00-09-34-964.png?updatedAt=1758480146212&ik-s=4f744f417100daea8710c3389638e583c2987985',
    tag: 'sg-tournaments-update',
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SG Tournaments', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});
