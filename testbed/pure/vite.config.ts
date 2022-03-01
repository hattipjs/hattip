import { defineConfig, SSROptions } from "vite";
import vavite from "vavite";

const ssr: SSROptions = {
	noExternal: ["node-fetch"],
};

export default defineConfig((env) => ({
	plugins: [
		vavite({
			handlerEntry: "/entry-node.ts",
		}),
	],
	// @ts-expected-error: SSR options are not official yet
	ssr: env.command === "build" ? ssr : false,
}));
