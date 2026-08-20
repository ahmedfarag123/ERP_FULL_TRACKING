import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

const apps = [
  {
    name: "sales",
    htmlPath: "sales/index.html",
    publicRoot: "public",
    manifestPath: "public/sales-manifest.webmanifest",
    serviceWorkerPath: "public/sales-sw.js",
  },
  {
    name: "driver",
    htmlPath: "driver_team/index.html",
    publicRoot: "driver_team/public",
    manifestPath: "driver_team/public/manifest.json",
    serviceWorkerPath: "driver_team/public/sw.js",
  },
];

const requiredManifestFields = [
  "name",
  "short_name",
  "description",
  "start_url",
  "scope",
  "display",
  "background_color",
  "theme_color",
  "icons",
  "screenshots",
  "categories",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toLocalAssetPath(publicRoot, assetSrc) {
  const relative = assetSrc.replace(/^\/+/, "").replace(/^(sales|driver)\//, "");
  return normalize(join(publicRoot, relative));
}

function hasIconSize(manifest, size) {
  return manifest.icons.some((icon) => String(icon.sizes).split(/\s+/).includes(size));
}

function hasPurpose(manifest, purpose) {
  return manifest.icons.some((icon) => String(icon.purpose ?? "any").split(/\s+/).includes(purpose));
}

for (const app of apps) {
  const html = readFileSync(app.htmlPath, "utf8");
  const manifest = JSON.parse(readFileSync(app.manifestPath, "utf8"));
  const serviceWorker = readFileSync(app.serviceWorkerPath, "utf8");

  assert(/<meta\s+name=["']viewport["']/i.test(html), `${app.name}: missing viewport meta`);
  assert(/<meta\s+name=["']theme-color["']/i.test(html), `${app.name}: missing theme-color meta`);
  assert(/<link\s+rel=["']manifest["']/i.test(html), `${app.name}: missing manifest link`);
  assert(/serviceWorker\.register/.test(html), `${app.name}: missing service worker registration`);

  for (const field of requiredManifestFields) {
    assert(manifest[field] !== undefined, `${app.name}: manifest missing ${field}`);
  }

  assert(manifest.display === "standalone", `${app.name}: display must be standalone`);
  assert(String(manifest.start_url).startsWith(manifest.scope), `${app.name}: start_url must be in scope`);
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, `${app.name}: manifest needs icons`);
  assert(hasIconSize(manifest, "192x192"), `${app.name}: missing 192x192 icon`);
  assert(hasIconSize(manifest, "512x512"), `${app.name}: missing 512x512 icon`);
  assert(hasPurpose(manifest, "any"), `${app.name}: missing any-purpose icon`);
  assert(hasPurpose(manifest, "maskable"), `${app.name}: missing maskable icon`);
  assert(Array.isArray(manifest.screenshots) && manifest.screenshots.length > 0, `${app.name}: missing screenshots`);
  assert(Array.isArray(manifest.categories) && manifest.categories.length > 0, `${app.name}: missing categories`);

  for (const icon of manifest.icons) {
    assert(existsSync(toLocalAssetPath(app.publicRoot, icon.src)), `${app.name}: missing icon ${icon.src}`);
  }

  for (const screenshot of manifest.screenshots) {
    assert(
      existsSync(toLocalAssetPath(app.publicRoot, screenshot.src)),
      `${app.name}: missing screenshot ${screenshot.src}`,
    );
  }

  assert(/addEventListener\(["']install["']/.test(serviceWorker), `${app.name}: sw missing install handler`);
  assert(/addEventListener\(["']activate["']/.test(serviceWorker), `${app.name}: sw missing activate handler`);
  assert(/addEventListener\(["']fetch["']/.test(serviceWorker), `${app.name}: sw missing fetch handler`);
  assert(/cache/i.test(serviceWorker), `${app.name}: sw does not cache assets`);

  console.log(`${app.name}: PWA readiness checks passed`);
}
