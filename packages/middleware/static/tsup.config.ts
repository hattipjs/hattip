import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: [
			"./src/index.ts",
			"./src/node.ts",
			"./src/fs.node.ts",
			"./src/fs.deno.ts",
			"./src/fs.bun.ts",
			"./src/fs.workerd.ts",
		],
		format: ["esm"],
		platform: "node",
		target: "node18",
		shims: false,
		external: ["__STATIC_CONTENT_MANIFEST"],
		dts: {
			entry: {
				index: "./src/index.ts",
				node: "./src/node.ts",
				fs: "./src/fs.node.ts",
			},
		},
	},
]);
