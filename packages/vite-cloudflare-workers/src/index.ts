/// <reference types="@vavite/multibuild/vite-config" />

import { PluginOption, UserConfig, SSROptions, ResolvedConfig } from "vite";
import bundle from "@hattip/bundler-cloudflare-workers";

export interface CloudflareWorkersPluginOptions {
  entry?: string;
  output?: string;
  serveStaticAssets?: boolean;
}

export default function cloudflareWorkersPlugin(
  options: CloudflareWorkersPluginOptions = {},
): PluginOption[] {
  const { entry, output, serveStaticAssets } = options;

  let resolvedConfig: ResolvedConfig;
  let skip = false;
  let buildFailed = false;

  return [
    !entry && {
      name: "hattip:cloudflare-workers:default-entry",
      apply: "build",
      enforce: "pre",

      resolveId(source, importer, options) {
        if (source === DEFAULT_ENTRY_NAME) {
          return this.resolve(
            serveStaticAssets
              ? "@hattip/vite-cloudflare-workers/static-assets-entry"
              : "@hattip/vite-cloudflare-workers/default-entry",
            importer,
            options,
          );
        }
      },

      config() {
        const config: UserConfig & { ssr: SSROptions } = {
          ssr: {
            noExternal: ["@hattip/vite-cloudflare-workers"],
          },
        };

        return config;
      },
    },

    {
      name: "hattip:cloudflare-workers",
      apply: "build",
      enforce: "post",

      config(cfg) {
        if (!cfg.build?.ssr) {
          skip = true;
          return;
        }

        const config: UserConfig & {
          ssr?: SSROptions;
        } = {
          ssr: {
            target: "webworker",
          },

          resolve: {
            mainFields: ["module", "main", "browser"],
            conditions: ["worker"],
          },

          build: {
            rollupOptions: {
              input: {
                index: entry || DEFAULT_ENTRY_NAME,
              },
            },
          },
        };

        return config;
      },

      configResolved(config) {
        resolvedConfig = config;

        if (skip) return;

        // This hack is needed to remove a `require` call inserted by this builtin Vite plugin.
        (config.plugins as any) = config.plugins.filter(
          (x) => x && x.name !== "vite:ssr-require-hook",
        );
      },

      generateBundle() {
        if (skip) return;

        this.emitFile({
          type: "asset",
          fileName: "cloudflare-workers-entry.js",
          source: serveStaticAssets
            ? STATIC_ASSETS_HANDLER
            : `export { default } from "."`,
        });
      },

      buildEnd(error) {
        if (error) {
          buildFailed = true;
        }
      },

      async closeBundle() {
        if (skip || buildFailed) return;

        resolvedConfig.logger.info("Bundling for Cloudflare Workers");

        bundle({
          cfwEntry:
            resolvedConfig.build.outDir + "/cloudflare-workers-entry.js",
          output:
            output ||
            resolvedConfig.build.outDir + "/cloudflare-workers-bundle/index.js",
        });
      },
    },
  ];
}

const DEFAULT_ENTRY_NAME = "/virtual:hattip:cloudflare-workers:default-entry";
const STATIC_ASSETS_HANDLER = `
  import createHandler from ".";
  import manifest from "__STATIC_CONTENT_MANIFEST";
  export default createHandler(manifest);
`;
