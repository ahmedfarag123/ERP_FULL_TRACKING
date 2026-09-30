const CACHE_NAME = 'horeca-smart-dispatcher-v7';
const APP_SHELL = [
  '/dispatcher/',
  '/dispatcher/index.html',
  '/dispatcher/manifest.json',
  '/dispatcher/favicon.ico',
  '/dispatcher/logo.png',
  '/dispatcher/apple-icon-180.png',
  '/dispatcher/dispatcher-icon-192.png',
  '/dispatcher/dispatcher-icon-512.png',
  '/dispatcher/manifest-icon-192.maskable.png',
  '/dispatcher/manifest-icon.png'
];
const BUILD_ASSET_PATTERN = /(?:href|src)="([^"]*\/dispatcher\/assets\/[^"]+)"/g;
const HASHED_ASSET_PATTERN = /\/dispatcher\/assets\/.+\.(?:js|css|png|svg|woff2?|json)$/;

function extractBuildAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(BUILD_ASSET_PATTERN)) {
    urls.add(new URL(match[1], self.location.origin).toString());
  }
  return Array.from(urls);
}

async function precacheBuildAssets(cache) {
  const response = await fetch('/dispatcher/', { cache: 'no-store' });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put('/dispatcher/', response.clone());
  await cache.put('/dispatcher/index.html', response.clone());
  const buildAssets = extractBuildAssets(html);
  if (buildAssets.length) {
    await Promise.allSettled(buildAssets.map((url) => cache.add(url)));
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
        await precacheBuildAssets(cache).catch(() => {});
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Navigations: always try network first, fall back to cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/dispatcher/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/dispatcher/index.html'))
    );
    return;
  }

  // Hashed build assets are immutable per content: cache-first, network fallback.
  if (HASHED_ASSET_PATTERN.test(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => Response.error());
      })
    );
    return;
  }

  // Same-origin requests: always try network first, cache on success, and fall
  // back to the cache only when the network is unavailable.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});