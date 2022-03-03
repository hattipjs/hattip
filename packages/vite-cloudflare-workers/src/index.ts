import { PluginOption, UserConfig, SSROptions, ResolvedConfig } from "vite";
import bundle from "@hattip/bundler-cloudflare-workers";

export interface CloudflareWorkersPluginOptions {
  entry?: string;
  output?: string;
}

export default function cloudflareWorkersPlugin(
  options: CloudflareWorkersPluginOptions = {},
): PluginOption[] {
  const { entry, output } = options;

  let resolvedConfig: ResolvedConfig;

  return [
    !entry && {
      name: "hattip:cloudflare-workers:default-entry",
      apply: "build",
      enforce: "pre",

      resolveId(source, importer, options) {
        if (source === DEFAULT_ENTRY_NAME) {
          return this.resolve(
            "@hattip/vite-cloudflare-workers/default-entry",
            importer,
            options,
          );
          return source;
        }
      },

      // load(id) {
      //   if (id === DEFAULT_ENTRY_NAME) {
      //     return `export { default } from "@hattip/vite-cloudflare-workers/default-entry";`;
      //   }
      // },

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

      config() {
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
        // This hack is needed to remove a `require` call inserted by this builtin Vite plugin.
        (config.plugins as any) = config.plugins.filter(
          (x) => x && x.name !== "vite:ssr-require-hook",
        );

        resolvedConfig = config;
      },

      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "cloudflare-workers-entry.js",
          source: `export { default } from "."`,
        });
      },

      async closeBundle() {
        resolvedConfig.logger.info("Bundling for Cloudflare Workers");

        bundle({
          entry: resolvedConfig.build.outDir + "/cloudflare-workers-entry.js",
          output:
            output ||
            resolvedConfig.build.outDir + "/cloudflare-workers-bundle/index.js",
        });
      },
    },
  ];
}

const DEFAULT_ENTRY_NAME = "/virtual:hattip:cloudflare-workers:default-entry";
