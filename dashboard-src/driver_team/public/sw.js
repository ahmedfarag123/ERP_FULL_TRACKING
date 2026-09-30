const CACHE_NAME = 'horeca-smart-driver-v9';
const APP_SHELL = [
  '/driver/',
  '/driver/index.html',
  '/driver/manifest.json',
  '/driver/favicon.ico',
  '/driver/logo.png',
  '/driver/apple-icon-180.png',
  '/driver/driver-icon-192.png',
  '/driver/driver-icon-512.png',
  '/driver/manifest-icon-192.maskable.png',
  '/driver/manifest-icon-512.maskable.png',
  '/driver/manifest-icon.png',
  '/driver/images/app-icon.png',
  '/driver/images/empty-deliveries.png',
  '/driver/images/empty-route.png'
];
const BUILD_ASSET_PATTERN = /(?:href|src)="([^"]*\/driver\/assets\/[^"]+)"/g;

function extractBuildAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(BUILD_ASSET_PATTERN)) {
    urls.add(new URL(match[1], self.location.origin).toString());
  }
  return Array.from(urls);
}

async function precacheBuildAssets(cache) {
  const response = await fetch('/driver/', { cache: 'no-store' });
  if (!response.ok) {
    return;
  }

  const html = await response.clone().text();
  await cache.put('/driver/', response.clone());
  await cache.put('/driver/index.html', response.clone());

  const buildAssets = extractBuildAssets(html);
  if (buildAssets.length) {
    await cache.addAll(buildAssets);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);
        await precacheBuildAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/driver/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/driver/index.html'))
    );
    return;
  }

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
