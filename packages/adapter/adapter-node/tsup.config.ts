import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: [
			"./src/index.ts",
			"./src/native-fetch.ts",
			"./src/whatwg-node.ts",
			"./src/request.ts",
			"./src/response.ts",
		],
		format: ["esm"],
		platform: "node",
		target: "node14",
		dts: true,
	},
]);
