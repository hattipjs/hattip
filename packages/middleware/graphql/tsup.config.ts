import { defineConfig } from "tsup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
	{
		entry: ["./src/index.ts", "./src/yoga.ts"],
		format: ["esm"],
		platform: "node",
		target: "node14",
		shims: false,
		dts: true,
		noExternal: ["graphql-yoga"],
		esbuildPlugins: [
			{
				name: "fetch-shim",
				setup(build) {
					build.onResolve(
						{
							filter: /^@whatwg-node\/fetch$/,
						},
						async () => ({
							path: path.resolve(dirname, "./fetch.shim.js"),
						}),
					);
				},
			},
		],
	},
]);
