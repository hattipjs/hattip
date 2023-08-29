import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["./src/index.ts"],
		format: ["esm"],
		platform: "node",
		target: "es2020",
		shims: false,
		dts: true,
		external: ["__STATIC_CONTENT_MANIFEST"],
	},
]);
