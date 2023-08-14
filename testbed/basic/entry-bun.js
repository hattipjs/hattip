// @ts-check
import bunAdapter from "@hattip/adapter-bun";
import handler from "./index.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const staticMiddleware = createStaticMiddleware(files, createFileReader(root), {
	gzip: true,
});

export default bunAdapter((ctx) => {
	return staticMiddleware(ctx) || handler(ctx);
});
