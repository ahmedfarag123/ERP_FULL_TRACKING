import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const projectRoot = __dirname;
const salesRoot = resolve(projectRoot, "sales");
const publicRoot = resolve(projectRoot, "public");
const rootNodeModules = resolve(projectRoot, "node_modules");
const salesPublicUrls = new Map([
  ["/sales-manifest.webmanifest", "sales-manifest.webmanifest"],
  ["/sales/sales-manifest.webmanifest", "sales-manifest.webmanifest"],
  ["/sales-icon-192.png", "sales-icon-192.png"],
  ["/sales/sales-icon-192.png", "sales-icon-192.png"],
  ["/sales-icon-512.png", "sales-icon-512.png"],
  ["/sales/sales-icon-512.png", "sales-icon-512.png"],
  ["/sales-dashboard-shot.png", "sales-dashboard-shot.png"],
  ["/sales/sales-dashboard-shot.png", "sales-dashboard-shot.png"],
  ["/sales-offline.html", "sales-offline.html"],
  ["/sales/sales-offline.html", "sales-offline.html"],
  ["/sales-sw.js", "sales-sw.js"],
  ["/sales/sales-sw.js", "sales-sw.js"],
  ["/favicon.png", "favicon.png"],
  ["/sales/favicon.png", "favicon.png"],
]);

function getContentType(fileName: string) {
  if (fileName.endsWith(".webmanifest")) return "application/manifest+json";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (fileName.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

export default defineConfig(({ command }) => ({
  base: "/sales/",
  root: salesRoot,
  envDir: projectRoot,
  publicDir: resolve(projectRoot, "public"),
  plugins: [
    {
      name: "sales-public-base-alias",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url) {
            next();
            return;
          }

          const url = new URL(req.url, "http://localhost");
          const publicFile = salesPublicUrls.get(url.pathname);
          if (!publicFile) {
            next();
            return;
          }

          const filePath = resolve(publicRoot, publicFile);
          if (!existsSync(filePath)) {
            next();
            return;
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", getContentType(publicFile));
          createReadStream(filePath).pipe(res);
        });
      },
    },
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    fs: {
      allow: [projectRoot],
    },
    open: "/",
  },
  legacy:
    command === "serve"
      ? {
          // Local dev can inherit a stale @vite/client from old localhost caches.
          skipWebSocketTokenCheck: true,
        }
      : undefined,
  build: {
    rollupOptions: {
      input: resolve(salesRoot, "index.html"),
    },
    outDir: resolve(projectRoot, "dist/sales"),
    emptyOutDir: false,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "leaflet",
      "react-leaflet",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: resolve(rootNodeModules, "react"),
      "react-dom": resolve(rootNodeModules, "react-dom"),
      "react-dom/client": resolve(rootNodeModules, "react-dom/client"),
      "react/jsx-runtime": resolve(rootNodeModules, "react/jsx-runtime"),
      "react/jsx-dev-runtime": resolve(rootNodeModules, "react/jsx-dev-runtime"),
    },
  },
}));
