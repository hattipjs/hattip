/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		// TODO: This workaround is for what seems to be a Vitest bug
		{
			name: "resolve-graphql-cjs",
			enforce: "pre",
			async resolveId(id, importer, options) {
				if (id === "graphql") {
					const resolved = await this.resolve(id, importer, {
						...options,
						skipSelf: true,
					});

					if (resolved) {
						resolved.id = resolved.id.replace(/\.mjs$/, ".js");
					}

					return resolved;
				}
			},
		},
	],
});
