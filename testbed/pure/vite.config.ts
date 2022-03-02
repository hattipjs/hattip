import { defineConfig, UserConfig, SSROptions } from "vite";
import bundleCfw from "@hattip/adapter-cloudflare-workers/bundler";
import vavite from "vavite";

const ssr: SSROptions = {
	noExternal: ["node-fetch"],
};

export default defineConfig((env) => {
	const target = process.env.DEPLOY_TARGET || "node";

	return {
		// @ts-expected-error: SSR options are not official yet
		ssr: env.command === "build" ? ssr : false,

		plugins: [
			(env.command === "serve" || target === "node") &&
				vavite({
					handlerEntry: "/entry-node.ts",
				}),

			target === "cfw" && {
				name: "cloudflare-workers-adapter",
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
									index: "entry-cfw.ts",
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
				},

				async closeBundle() {
					// eslint-disable-next-line no-console
					console.log("Bundling for Cloudflare Workers");

					bundleCfw({
						entry: "entry-cfw.ts",
						output: "./dist/cfw-bundle.js",
					});
				},
			},
		],
	};
});
