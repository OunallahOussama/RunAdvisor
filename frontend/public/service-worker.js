const CACHE_NAME = 'runadvisor-shell-v4';
const APP_SHELL_URL = '/';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  APP_SHELL_URL,
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg',
  '/apple-touch-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

function updateCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') {
    return response;
  }

  const responseClone = response.clone();

  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, responseClone);
  });

  return response;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          const offline = await caches.match(OFFLINE_URL);
          return offline;
        })
      );
    }

    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    const isOAuthCallback = url.pathname === '/callback' && url.search.length > 1;

    if (isOAuthCallback) {
      event.respondWith(fetch(request));
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => updateCache(request, response))
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          const shell = await caches.match(APP_SHELL_URL);
          if (shell) {
            return shell;
          }

          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkRequest = fetch(request)
        .then((response) => updateCache(request, response))
        .catch(() => cachedResponse);

      return cachedResponse || networkRequest;
    })
  );
});
