import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["./src/index.ts"],
		format: ["esm"],
		platform: "node",
		target: "node14",
		shims: false,
		dts: true,
		external: [/^https:/],
	},
]);
