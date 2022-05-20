import { build, BuildOptions } from "esbuild";
import { builtinModules } from "module";
import path from "path";

export interface BundleOptions {
  cfwEntry?: string;
  handlerEntry?: string;
  output: string;
}

export default async function bundle(
  options: BundleOptions,
  manipulateEsbuildOptions?: (options: BuildOptions) => void | Promise<void>,
) {
  const { cfwEntry, handlerEntry, output } = options;

  if (!cfwEntry) {
    if (!handlerEntry) {
      throw new Error("Must provide either cfwEntry or handlerEntry");
    }
  } else if (handlerEntry) {
    throw new Error("Cannot provide both cfwEntry and handlerEntry");
  }

  const esbuildOptions: BuildOptions = {
    logLevel: "info",
    bundle: true,
    minify: true,
    entryPoints: [cfwEntry || "virtual:entry-cfw.js"],
    outfile: output,
    platform: "browser",
    target: "chrome96",
    format: "esm",
    mainFields: ["module", "main", "browser"],
    conditions: ["worker", "import", "require"],
    external: [...builtinModules, "__STATIC_CONTENT_MANIFEST"],
  };

  if (!cfwEntry) {
    esbuildOptions.plugins = [
      {
        name: "hattip-virtual-cfw-entry",
        setup(build) {
          build.onResolve(
            {
              filter: /^virtual:entry-cfw\.js$/,
            },
            () => ({
              path: "virtual:entry-cfw.js",
              namespace: "hattip-virtual-cfw-entry",
            }),
          );

          build.onLoad(
            {
              filter: /.*/,
              namespace: "hattip-virtual-cfw-entry",
            },
            () => {
              return {
                resolveDir: process.cwd(),
                contents: getCfwEntryContents(handlerEntry!),
              };
            },
          );
        },
      },
    ];
  }

  await manipulateEsbuildOptions?.(esbuildOptions);
  await build(esbuildOptions);
}

function getCfwEntryContents(handlerEntry: string) {
  const relativeName = path.relative(process.cwd(), handlerEntry);

  return `
  import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
  import handler from ${JSON.stringify("./" + relativeName)};

  export default {
    fetch: cloudflareWorkersAdapter(handler),
  };
  `;
}
