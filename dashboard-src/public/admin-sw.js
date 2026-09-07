const CACHE_NAME = 'horeca-admin-v73';
const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
];
const BUILD_ASSET_PATTERN = /(?:href|src)="([^"]*\/assets\/[^"]+)"/g;

function extractBuildAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(BUILD_ASSET_PATTERN)) {
    urls.add(new URL(match[1], self.location.origin).toString());
  }
  return Array.from(urls);
}

async function precacheBuildAssets(cache) {
  const response = await fetch('/', { cache: 'no-store' });
  if (!response.ok) return;

  const html = await response.clone().text();
  await cache.put('/', response.clone());
  await cache.put('/index.html', response.clone());

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

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);

  // Only handle same-origin requests
  if (requestUrl.origin !== self.location.origin) return;

  // Skip Supabase API calls and realtime
  if (requestUrl.pathname.includes('/rest/v1/') || requestUrl.pathname.includes('/realtime/v1/')) return;

  // Navigation requests: network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
