const CACHE_NAME = 'project-management-v1'
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/styles/globals.css',
  '/manifest.json'
]

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('Service worker cache failed, continuing anyway:', error)
          return Promise.resolve()
        })
      })
  )
  self.skipWaiting()
})

// Fetch from cache or network
self.addEventListener('fetch', (event) => {
  // Skip caching for non-GET requests and chrome-extension URLs
  const { request } = event
  const url = new URL(request.url)
  
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }

        return fetch(request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache).catch((error) => {
                // Silently ignore cache errors
                console.debug('Cache put failed:', error.message)
              })
            })

          return response
        })
      })
  )
})

// Update service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
