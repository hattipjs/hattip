import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["./src/index.ts", "./src/bundler.ts"],
		format: ["esm", "cjs"],
		platform: "node",
		target: "node14",
		dts: true,
	},
]);
