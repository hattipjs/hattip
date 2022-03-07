import { defineConfig } from "vite";
import cfw from "@hattip/vite-cloudflare-workers";
import vavite from "vavite";

export default defineConfig((env) => {
  const target = process.env.DEPLOY_TARGET || "node";

  return {
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

export interface HattipViteOptions {
  /** Entry module that default exports a Hattip handler function */
  handlerEntry?: string;

  /** Directory where static assets are located. Set it to client build's
   * output directory to serve static assets from there. If not set, no static
   * assets will be served. */
  staticAssetsDir?: string;

  /** Custom entry that default exports a Node-style (req, res, next) handler */
  customNodeHandlerEntry?: string;

  /** Custom server entry to be used in production only */
  customProdServerEntry?: string;

  /** Custom server entry. For production, `customProdServerEntry` has precedence
   * over this option if provided. */
  customServerEntry?: string;
}
