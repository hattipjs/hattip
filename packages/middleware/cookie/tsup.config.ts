import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["./src/index.ts", "./src/parse.ts", "./src/serialize.ts"],
		format: ["esm"],
		platform: "node",
		target: "node18",
		shims: false,
		dts: true,
	},
]);
