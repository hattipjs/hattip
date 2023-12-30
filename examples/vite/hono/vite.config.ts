import { defineConfig } from "vite";
import { hattip } from "@hattip/vite";

export default defineConfig({
	plugins: [
		hattip({
			hattipEntry: "/src/entry-hattip.ts",
			clientEntries: ["/src/entry-client.ts"],
		}),
	],
});
