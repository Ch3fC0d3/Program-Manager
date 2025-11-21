// Disabled service worker - just skip waiting and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Don't intercept any fetches - let them go through normally
self.addEventListener('fetch', (event) => {
  // Do nothing - let the browser handle all requests normally
})
