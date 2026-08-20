import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const projectRoot = __dirname;
const salesIndexHtml = resolve(projectRoot, "sales/index.html");
const driverIndexHtml = resolve(projectRoot, "driver_team/index.html");
const dispatcherIndexHtml = resolve(projectRoot, "dispatcher/index.html");
const publicRoot = resolve(projectRoot, "public");
const driverPublicRoot = resolve(projectRoot, "driver_team/public");
const dispatcherPublicRoot = resolve(projectRoot, "dispatcher/public");
const rootRequire = createRequire(resolve(projectRoot, "package.json"));
const driverRequire = createRequire(resolve(projectRoot, "driver_team/package.json"));
const dispatcherRequire = createRequire(resolve(projectRoot, "dispatcher/package.json"));
const postcss = rootRequire("postcss");
const driverTailwindcss = driverRequire("tailwindcss");
const driverAutoprefixer = driverRequire("autoprefixer");
const dispatcherTailwindcss = dispatcherRequire("tailwindcss");
const dispatcherAutoprefixer = dispatcherRequire("autoprefixer");
const tailwindcssPostcss = rootRequire("@tailwindcss/postcss");

function getPublicAssetContentType(fileName: string) {
  if (fileName.endsWith(".json")) return "application/json; charset=utf-8";
  if (fileName.endsWith(".webmanifest")) return "application/manifest+json";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".ico")) return "image/x-icon";
  if (fileName.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (fileName.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function prepareWorkspaceHtml(html: string, app: "sales" | "driver" | "dispatcher") {
  const entry =
    app === "sales"
      ? "/sales_team/main.tsx"
      : app === "driver"
        ? "/driver_team/src/main.tsx"
        : "/dispatcher/src/main.tsx";
  const publicPrefix = app === "sales" ? "sales" : app;

  return html
    .replace('src="/src/main.tsx"', `src="${entry}"`)
    .replace('src="./main.tsx"', `src="${entry}"`)
    .replace('href="manifest.json"', `href="/${publicPrefix}/manifest.json"`);
}

// https://vite.dev/config/
// Default config: serves/builds the Tailwind v4 apps. The driver app uses its
// own Tailwind v3 workspace config via npm run dev:driver / build:driver.
export default defineConfig({
  plugins: [
    {
      name: "manifest-fallback",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/manifest.json" && req.method === "GET") {
            try {
              const manifest = readFileSync(
                resolve(projectRoot, "public/manifest.json"),
                "utf-8",
              );
              res.setHeader("Content-Type", "application/manifest+json");
              res.statusCode = 200;
              res.end(manifest);
            } catch {
              next();
            }
            return;
          }
          next();
        });
      },
    },
    {
      name: "workspace-spa-dev-fallbacks",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || req.method !== "GET") {
            next();
            return;
          }

          const url = new URL(req.url, "http://localhost");
          const acceptsHtml = req.headers.accept?.includes("text/html") ?? false;
          const isSalesRoute = url.pathname === "/sales" || url.pathname.startsWith("/sales/");
          const isDriverRoute = url.pathname === "/driver" || url.pathname.startsWith("/driver/");
          const isDispatcherRoute = url.pathname === "/dispatcher" || url.pathname.startsWith("/dispatcher/");
          const isFileRequest = /\.[^/]+$/.test(url.pathname);

          if (!acceptsHtml || isFileRequest) {
            next();
            return;
          }

          try {
            let html: string | null = null;
            if (isSalesRoute) {
              html = prepareWorkspaceHtml(readFileSync(salesIndexHtml, "utf8"), "sales");
            } else if (isDriverRoute) {
              html = prepareWorkspaceHtml(readFileSync(driverIndexHtml, "utf8"), "driver");
            } else if (isDispatcherRoute) {
              html = prepareWorkspaceHtml(readFileSync(dispatcherIndexHtml, "utf8"), "dispatcher");
            }

            if (!html) {
              next();
              return;
            }

            const transformed = await server.transformIndexHtml(url.pathname, html);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(transformed);
          } catch (error) {
            next(error);
          }
        });
      },
    },
    {
      name: "app-prefixed-public-assets",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url || req.method !== "GET") {
            next();
            return;
          }

          const url = new URL(req.url, "http://localhost");
          const match = url.pathname.match(/^\/(driver|sales|dispatcher)\/([^/]+(?:\.[^/]+)?)$/);
          if (!match) {
            next();
            return;
          }

          const app = match[1];
          const publicFile = match[2];
          const appPublicRoot =
            app === "driver"
              ? driverPublicRoot
              : app === "dispatcher"
                ? dispatcherPublicRoot
                : publicRoot;
          const filePath = resolve(appPublicRoot, publicFile);
          if (!existsSync(filePath)) {
            next();
            return;
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", getPublicAssetContentType(publicFile));
          createReadStream(filePath).pipe(res);
        });
      },
    },
    {
      name: "workspace-at-aliases",
      enforce: "pre",
      async resolveId(source, importer) {
        if (!source.startsWith("@/") || !importer) {
          return null;
        }

        const normalizedImporter = importer.replace(/\\/g, "/");
        if (normalizedImporter.includes("/dispatcher/src/")) {
          return this.resolve(
            resolve(projectRoot, "dispatcher/src", source.slice(2)),
            importer,
            { skipSelf: true },
          );
        }
        if (normalizedImporter.includes("/driver_team/src/")) {
          return this.resolve(
            resolve(projectRoot, "driver_team/src", source.slice(2)),
            importer,
            { skipSelf: true },
          );
        }

        return null;
      },
    },
    {
      name: "driver-tailwind-v3-css",
      enforce: "pre",
      async transform(code, id) {
        const normalizedId = id.replace(/\\/g, "/");
        const isDriverCss = normalizedId.endsWith("/driver_team/src/index.css");
        const isDispatcherCss = normalizedId.endsWith("/dispatcher/src/index.css");
        if (!isDriverCss && !isDispatcherCss) {
          return null;
        }

        const tailwindcss = isDispatcherCss ? dispatcherTailwindcss : driverTailwindcss;
        const autoprefixer = isDispatcherCss ? dispatcherAutoprefixer : driverAutoprefixer;
        const config = isDispatcherCss
          ? resolve(projectRoot, "dispatcher/tailwind.config.js")
          : resolve(projectRoot, "driver_team/tailwind.config.js");

        const result = await postcss([
          tailwindcss({ config }),
          autoprefixer(),
        ]).process(code, { from: id });

        return { code: result.css, map: null };
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
  build: {
    rollupOptions: {
      input: {
        admin: resolve(__dirname, "index.html"),
        sales: resolve(__dirname, "sales/index.html"),
      },
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcssPostcss(),
      ],
    },
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
    alias: {
      "@": resolve(__dirname, "driver_team/src"),
    },
  },
});
