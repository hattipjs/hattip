import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: [
			"./src/http/index.ts",
			"./src/http/native-fetch.ts",
			"./src/http/whatwg-node.ts",
			"./src/http2/index.ts",
			"./src/http2/native-fetch.ts",
			"./src/http2/whatwg-node.ts",
			"./src/request.ts",
			"./src/response.ts",
			"./src/fast-fetch.ts",
		],
		format: ["esm"],
		platform: "node",
		target: "node18",
		dts: true,
	},
]);
