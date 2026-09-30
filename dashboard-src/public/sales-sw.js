const SALES_CACHE = "sales-workspace-v11";
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

const SALES_OFFLINE_URL = "/sales/sales-offline.html";
const SALES_APP_URL = "/sales/";
const SALES_APP_INDEX_URL = "/sales/index.html";
const SALES_MANIFEST_URL = "/sales/sales-manifest.webmanifest";
const SALES_ICON_URL = "/sales/sales-icon-192.png";
const SALES_MASKABLE_ICON_URL = "/sales/sales-icon-512.png";
const SALES_APP_ASSETS = [
  SALES_APP_URL,
  SALES_APP_INDEX_URL,
  SALES_OFFLINE_URL,
  SALES_MANIFEST_URL,
  SALES_ICON_URL,
  SALES_MASKABLE_ICON_URL,
];
const SALES_BUILD_ASSET_PATTERN = /(?:href|src)="([^"]*\/sales\/assets\/[^"]+)"/g;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isSalesAppNavigation(url) {
  return isSameOrigin(url) && url.pathname.startsWith("/sales/");
}

async function getSalesAppShell() {
  return (await caches.match(SALES_APP_URL)) || (await caches.match(SALES_APP_INDEX_URL));
}

function extractSalesBuildAssets(html) {
  const urls = new Set();
  for (const match of html.matchAll(SALES_BUILD_ASSET_PATTERN)) {
    urls.add(new URL(match[1], self.location.origin).toString());
  }
  return Array.from(urls);
}

async function precacheSalesBuildAssets(cache) {
  const response = await fetch(SALES_APP_URL, { cache: "no-store" });
  if (!response.ok) {
    return;
  }

  const html = await response.clone().text();
  await cache.put(SALES_APP_URL, response.clone());
  await cache.put(SALES_APP_INDEX_URL, response.clone());

  const buildAssets = extractSalesBuildAssets(html);
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
    caches.open(SALES_CACHE).then(async (cache) => {
      await cache.addAll(SALES_APP_ASSETS);
      await precacheSalesBuildAssets(cache);
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
      Promise.all(keys.filter((key) => key !== SALES_CACHE).map((key) => caches.delete(key)))
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
        .then(async (response) => {
          const requestUrl = new URL(request.url);

          if (response.ok && isSalesAppNavigation(requestUrl)) {
            const cloned = response.clone();
            caches.open(SALES_CACHE).then((cache) => cache.put(request, cloned));
          }

          if (!response.ok && isSalesAppNavigation(requestUrl)) {
            return (await getSalesAppShell()) || response;
          }

          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          if (isSalesAppNavigation(new URL(request.url))) {
            const cachedAppShell = await getSalesAppShell();
            if (cachedAppShell) {
              return cachedAppShell;
            }
          }

          return caches.match(SALES_OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const cloned = response.clone();
          caches.open(SALES_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      }).catch(() => caches.match(request));
    })
  );
});
