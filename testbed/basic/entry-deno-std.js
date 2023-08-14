import { createServeHandler } from "@hattip/adapter-deno";
import hattipHandler from "./index.js";
import { serve } from "https://deno.land/std/http/server.ts";
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

serve(handler, { port: 3000 });
