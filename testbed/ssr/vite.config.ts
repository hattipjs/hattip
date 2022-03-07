/// <reference types="vavite/vite-config" />

import path from "path";
import { defineConfig } from "vite";
import vavite from "vavite";
import cfw from "@hattip/vite-cloudflare-workers";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

export default defineConfig((env) => {
  const target = process.env.DEPLOY_TARGET || "node";

  return {
    buildSteps: [
      {
        name: "client",
        config: {
          build: {
            outDir: "dist/client",
            manifest: true,
          },
        },
      },
      {
        name: "server",
        config: {
          build: {
            outDir: "dist/server",
            ssr: true,
          },
          resolve: {
            alias: {
              "./client-manifest": path.resolve(
                __dirname,
                "dist/client/manifest.json",
              ),
            },
          },
        },
      },
    ],

    build: {
      rollupOptions: {
        input: {
          vanilla: "client/vanilla.ts",
          react: "client/react.tsx",
          vue: "client/vue.ts",
        },
      },
    },

    plugins: [
      {
        name: "hattip:resolve-handler-entry",
        enforce: "pre",
        resolveId(source, importer, options) {
          if (source === "virtual:hattip:handler-entry") {
            return this.resolve("/index.ts", importer, options);
          }
        },
      },

      (env.command === "serve" || target === "node") &&
        vavite({
          handlerEntry: "/entry-node.ts",
          clientAssetsDir: "dist/client",
          serveClientAssetsInDev: true,
          bundleSirv: true,
        }),

      target === "cfw" &&
        cfw({
          output: "dist/cloudflare-workers-bundle/index.js",
          serveStaticAssets: true,
        }),

      react(),

      vue(),
    ],
  };
});
