import { createReadStream, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const projectRoot = __dirname;
const driverRoot = resolve(projectRoot, "driver");
const driverTeamRoot = resolve(projectRoot, "driver_team");
const publicRoot = resolve(projectRoot, "public");
const driverRequire = createRequire(resolve(driverTeamRoot, "package.json"));
const tailwindcss = driverRequire("tailwindcss");
const autoprefixer = driverRequire("autoprefixer");
const driverPublicUrls = new Map([
  ["/driver-manifest.webmanifest", "driver-manifest.webmanifest"],
  ["/driver/driver-manifest.webmanifest", "driver-manifest.webmanifest"],
  ["/driver-icon-192.png", "driver-icon-192.png"],
  ["/driver/driver-icon-192.png", "driver-icon-192.png"],
  ["/driver-icon-512.png", "driver-icon-512.png"],
  ["/driver/driver-icon-512.png", "driver-icon-512.png"],
  ["/driver-dashboard-shot.png", "driver-dashboard-shot.png"],
  ["/driver/driver-dashboard-shot.png", "driver-dashboard-shot.png"],
  ["/driver-offline.html", "driver-offline.html"],
  ["/driver/driver-offline.html", "driver-offline.html"],
  ["/driver-sw.js", "driver-sw.js"],
  ["/driver/driver-sw.js", "driver-sw.js"],
  ["/favicon.png", "favicon.png"],
  ["/driver/favicon.png", "favicon.png"],
]);

function getContentType(fileName: string) {
  if (fileName.endsWith(".webmanifest")) return "application/manifest+json";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (fileName.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

export default defineConfig(({ command }) => ({
  base: "/driver/",
  root: driverRoot,
  envDir: projectRoot,
  publicDir: resolve(projectRoot, "public"),
  plugins: [
    {
      name: "driver-public-base-alias",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (!req.url) {
            next();
            return;
          }

          const url = new URL(req.url, "http://localhost");
          const publicFile = driverPublicUrls.get(url.pathname);
          if (!publicFile) {
            next();
            return;
          }

          const filePath = resolve(publicRoot, publicFile);
          if (!existsSync(filePath)) {
            next();
            return;
          }

          _res.statusCode = 200;
          _res.setHeader("Content-Type", getContentType(publicFile));
          createReadStream(filePath).pipe(_res);
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
      input: resolve(driverRoot, "index.html"),
    },
    outDir: resolve(projectRoot, "dist/driver"),
    emptyOutDir: false,
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: resolve(driverTeamRoot, "tailwind.config.js") }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(driverTeamRoot, "src"),
    },
  },
}));
