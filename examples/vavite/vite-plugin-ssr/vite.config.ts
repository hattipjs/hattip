import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import ssr from "vite-plugin-ssr/plugin";
import vavite from "vavite";

const BUN = process.env.TARGET === "bun";

export default defineConfig({
	buildSteps: [
		{ name: "client" },
		{
			name: "server",
			config: {
				build: { ssr: true },
			},
		},
	],

	plugins: [
		vavite(
			BUN
				? { serverEntry: "/server/entry-bun.ts" }
				: {
						handlerEntry: "/server/entry-node.ts",
						serveClientAssetsInDev: true,
						clientAssetsDir: "dist/client",
				  },
		),
		react(),
		ssr({ disableAutoFullBuild: true }),
	],
});
