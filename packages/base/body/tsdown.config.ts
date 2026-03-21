import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["./src/web.ts", "./src/node.ts", "./src/detect.ts"],
		fixedExtension: false,
		format: ["esm"],
		platform: "node",
		target: "node20",
		sourcemap: true,
		dts: true,
	},
]);
