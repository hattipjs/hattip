import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["./src/index.ts"],
		fixedExtension: false,
		format: ["esm"],
		platform: "node",
		target: "node20",
		sourcemap: true,
		dts: true,
	},
]);
