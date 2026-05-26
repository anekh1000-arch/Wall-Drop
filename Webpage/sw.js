const CACHE = 'walldrop-v4';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/brand.css', '/icons/logo.svg', '/icons/favicon.svg'];

/** Always fetch fresh — gallery data and scripts change on every upload */
const NETWORK_FIRST = ['/wallpapers.json', '/gallery.js', '/walldrop-app.js', '/index.html'];

function isNetworkFirst(url) {
  return NETWORK_FIRST.some((p) => url.pathname.endsWith(p) || url.pathname === p);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok && url.pathname.includes('/images/')) {
            caches.open(CACHE).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
