const DRIVER_CACHE = "driver-workspace-v8";
const IS_LOCAL_DEV_HOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname === "::1";

async function destroyLocalDevServiceWorker() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    clients.map((client) => {
      const url = new URL(client.url);
      if (url.searchParams.get("sw-dev-clean") === "1") {
        return undefined;
      }
      url.searchParams.set("sw-dev-clean", "1");
      return client.navigate(url.toString());
    })
  );
}

const DRIVER_OFFLINE_URL = "/driver/driver-offline.html";
const DRIVER_APP_URL = "/driver/";
const DRIVER_APP_INDEX_URL = "/driver/index.html";
const DRIVER_MANIFEST_URL = "/driver/driver-manifest.webmanifest";
const DRIVER_ICON_URL = "/driver/driver-icon-192.png";
const DRIVER_MASKABLE_ICON_URL = "/driver/driver-icon-512.png";
const DRIVER_APP_ASSETS = [
  DRIVER_APP_URL,
  DRIVER_OFFLINE_URL,
  DRIVER_MANIFEST_URL,
  DRIVER_ICON_URL,
  DRIVER_MASKABLE_ICON_URL,
];
const DRIVER_BUILD_ASSET_PATTERN = /(?:href|src)="([^"]*\/driver\/assets\/[^"]+)"/g;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isDriverAppNavigation(url) {
  return isSameOrigin(url) && url.pathname.startsWith("/driver/");
}

function extractDriverBuildAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(DRIVER_BUILD_ASSET_PATTERN)) {
    urls.add(new URL(match[1], self.location.origin).toString());
  }
  return Array.from(urls);
}

async function precacheDriverBuildAssets(cache) {
  const response = await fetch(DRIVER_APP_URL, { cache: "no-store" });
  if (!response.ok) {
    return;
  }

  const html = await response.clone().text();
  await cache.put(DRIVER_APP_URL, response.clone());
  await cache.put(DRIVER_APP_INDEX_URL, response.clone());

  const buildAssets = extractDriverBuildAssets(html);
  if (buildAssets.length) {
    await cache.addAll(buildAssets);
  }
}

self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEV_HOST) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(DRIVER_CACHE).then(async (cache) => {
      await cache.addAll(DRIVER_APP_ASSETS);
      await precacheDriverBuildAssets(cache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (IS_LOCAL_DEV_HOST) {
    event.waitUntil(destroyLocalDevServiceWorker());
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== DRIVER_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV_HOST) {
    event.respondWith(fetch(event.request));
    return;
  }

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isDriverAppNavigation(new URL(request.url))) {
            const cloned = response.clone();
            caches.open(DRIVER_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          if (isDriverAppNavigation(new URL(request.url))) {
            const cachedAppShell = await caches.match(DRIVER_APP_URL);
            if (cachedAppShell) {
              return cachedAppShell;
            }
          }

          return caches.match(DRIVER_OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const cloned = response.clone();
          caches.open(DRIVER_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
