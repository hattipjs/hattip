import { Hono } from "hono";
import devServer from "virtual:vite-dev-server";
import type { Manifest } from "vite";
import type { AdapterRequestContext } from "@hattip/core";

const app = new Hono();

app.get("/", async (c) => {
	let clientScript = "/src/entry-client.ts";
	if (!devServer) {
		const manifest: { default: Manifest } = await import(
			// @ts-ignore: manifest.json is only available at build time
			"../dist/client/.vite/manifest.json"
		);
		clientScript = manifest.default[clientScript.slice(1)].file;
	}

	return c.html(`<!DOCTYPE html>
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

export default (ctx: AdapterRequestContext) => app.fetch(ctx.request);
