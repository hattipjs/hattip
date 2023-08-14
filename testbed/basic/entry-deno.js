// @ts-check
import { createServeHandler } from "@hattip/adapter-deno";
import hattipHandler from "./index.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const staticMiddleware = createStaticMiddleware(files, createFileReader(root), {
	gzip: true,
});

const handler = createServeHandler((ctx) => {
	return staticMiddleware(ctx) || hattipHandler(ctx);
});

// @ts-expect-error
Deno.serve({ port: 3000 }, handler);
