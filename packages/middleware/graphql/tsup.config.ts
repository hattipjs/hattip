import { defineConfig } from "tsup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
	{
		entry: ["./src/index.ts", "./src/yoga.ts"],
		format: ["esm"],
		platform: "node",
		target: "node18",
		shims: false,
		dts: true,
		// We wan't to bundle graphql-yoga so that we can use the
		// global fetch instead of @whatwg-node/fetch. But we still
		// want graphql-yoga in the dependencies to be able to resolve
		// the types.
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
