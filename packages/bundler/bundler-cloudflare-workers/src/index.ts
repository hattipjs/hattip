import { build, BuildOptions } from "esbuild";
import { builtinModules } from "node:module";
import path from "node:path";

/**
 * Bundling options
 */
export interface BundlingOptions {
	/**
	 * Module file that default exports a HatTip handler.
	 * You have to provide either this or `cfwEntry`, but
	 * not both.
	 */
	handlerEntry?: string;
	/**
	 * Whether to serve static files. Make sure to specify
	 * `site = { bucket = "static-dir" }` in your `wrangler.toml`
	 * or set this to `false`. @default true
	 */
	serveStaticFiles?: boolean;
	/**
	 * Custom Cloudflare Workers entry file. It's mutually exclusive with
	 * `handlerEntry`.
	 */
	cfwEntry?: string;
	/** Output file name for the bundle */
	output: string;
}

export default async function bundle(
	options: BundlingOptions,
	manipulateEsbuildOptions?: (options: BuildOptions) => void | Promise<void>,
) {
	const { cfwEntry, handlerEntry, output, serveStaticFiles } = options;

	if (!cfwEntry) {
		if (!handlerEntry) {
			throw new Error("Must provide either cfwEntry or handlerEntry");
		}
	} else {
		if (handlerEntry) {
			throw new Error("Cannot provide both cfwEntry and handlerEntry");
		}

		if (serveStaticFiles !== undefined) {
			throw new Error("Cannot provide serveStaticFiles with cfwEntry");
		}
	}

	const esbuildOptions: BuildOptions = {
		logLevel: "info",
		bundle: true,
		minify: true,
		entryPoints: [cfwEntry ?? "virtual:entry-cfw.js"],
		outfile: output,
		platform: "browser",
		target: "chrome96",
		format: "esm",
		mainFields: ["module", "main"],
		conditions: ["workerd", "worker", "import", "require"],
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
								contents: getCfwEntryContents(
									handlerEntry!,
									serveStaticFiles === false
										? "@hattip/adapter-cloudflare-workers/no-static"
										: "@hattip/adapter-cloudflare-workers",
								),
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

function getCfwEntryContents(handlerEntry: string, adapter: string) {
	const relativeName = path.relative(process.cwd(), handlerEntry);

	return `
  import cloudflareWorkersAdapter from ${JSON.stringify(adapter)};
  import handler from ${JSON.stringify("./" + relativeName)};

  export default {
    fetch: cloudflareWorkersAdapter(handler),
  };
  `;
}
