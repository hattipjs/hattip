import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: {
			index: "./src/vite-plugin.ts",
			cli: "./src/index.ts",
		},
		format: ["esm"],
		platform: "node",
		dts: {
			entry: {
				index: "./src/vite-plugin.ts",
			},
			resolve: false,
		},
	},
]);
