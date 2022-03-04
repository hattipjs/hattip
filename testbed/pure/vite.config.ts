import { defineConfig, SSROptions } from "vite";
import cfw from "@hattip/vite-cloudflare-workers";
import vavite from "vavite";

const ssr: SSROptions = {
  // Needed for tests
  noExternal: ["node-fetch"],
};

export default defineConfig((env) => {
  const target = process.env.DEPLOY_TARGET || "node";

  return {
    // @ts-expected-error: SSR options are not official yet
    ssr: env.command === "build" ? ssr : false,

    build: {},

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
        }),

      target === "cfw" && cfw(),
    ],
  };
});
