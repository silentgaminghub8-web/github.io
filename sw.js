const CACHE_NAME = 'sg-tournaments-v2.0.1';
const urlsToCache = [
  './',
  './index.html'
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
  // Skip cross-origin requests except for our resources
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('ik.imagekit.io') &&
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com')) {
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
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic update check (triggered from main page)
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
