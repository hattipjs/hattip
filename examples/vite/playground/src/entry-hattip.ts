import { createRouter } from "@hattip/router";
import { html } from "@hattip/response";
import devServer from "virtual:vite-dev-server";
import type { Manifest } from "vite";

const router = createRouter();

router.get("/", async () => {
	let clientScript: string;
	if (devServer) {
		clientScript = "/src/entry-client.ts";
	} else {
		const manifest: { default: Manifest } = await import(
			// @ts-expect-error: manifest.json is only available at build time
			"../dist/client/.vite/manifest.json"
		);
		clientScript = manifest.default["src/entry-client.ts"].file;
	}

	return html(`<!DOCTYPE html>
		<html>
			<head>
				<title>Playground</title>
			</head>
			<body>
				<h1>Playground</h1>
				<button>Clicked 0 time(s)</button>
				<script type="module" src="${clientScript}"></script>
			</body>
		</html>
	`);
});

export default router.buildHandler();
