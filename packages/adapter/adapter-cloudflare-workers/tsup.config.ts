import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["./src/index.ts", "./src/no-static.ts"],
		format: ["esm"],
		platform: "node",
		target: "node18",
		shims: false,
		dts: true,
		external: ["__STATIC_CONTENT_MANIFEST"],
	},
]);
