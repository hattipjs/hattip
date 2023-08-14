// @ts-check
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers/no-static";
import hattipHandler from "./index.js";
import { createStaticMiddleware, filesFromManifest } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";
import files from "./files";

const staticMiddleware = createStaticMiddleware(
	// @ts-ignore
	filesFromManifest(files),
	createFileReader(),
);

const handler = cloudflareWorkersAdapter((ctx) => {
	return staticMiddleware(ctx) || hattipHandler(ctx);
});

export default {
	fetch: handler,
};
