const CACHE = 'walldrop-v5';

/** HTML, scripts, styles, icons, and data — always prefer network so deploys show up immediately */
function networkFirst(request) {
  return fetch(request, { cache: 'no-store' })
    .then(function (res) {
      if (res && res.ok) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(request, clone);
        });
      }
      return res;
    })
    .catch(function () {
      return caches.match(request);
    });
}

function isAppShell(pathname) {
  if (pathname.endsWith('.html') || pathname === '/') return true;
  if (/\.(js|css|json)$/i.test(pathname)) return true;
  if (pathname.indexOf('/icons/') === 0) return true;
  if (pathname === '/sw.js') return true;
  if (pathname.indexOf('/api/') === 0) return true;
  return false;
}

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) {
            return k !== CACHE;
          }).map(function (k) {
            return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (isAppShell(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.indexOf('/images/') !== -1) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        var network = fetch(event.request).then(function (res) {
          if (res.ok) {
            caches.open(CACHE).then(function (c) {
              c.put(event.request, res.clone());
            });
          }
          return res;
        });
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(networkFirst(event.request));
});
