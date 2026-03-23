/// <reference types="bun-types" />
import { createHandler } from "@hattip/adapter-bun";
import { handler } from "./hattip-common.ts";

Bun.serve({
	port: 3000,
	fetch: createHandler(handler),
});
