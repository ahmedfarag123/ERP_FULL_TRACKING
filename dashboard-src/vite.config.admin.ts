import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  publicDir: "public",
  server: {
    proxy: {
      "/driver": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/dispatcher": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    {
      name: "manifest-fallback",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/manifest.json" && req.method === "GET") {
            try {
              const manifest = readFileSync(
                resolve(__dirname, "public/manifest.json"),
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
      input: resolve(__dirname, "index.html"),
      output: {
        entryFileNames: "assets/admin-[hash].js",
      },
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
