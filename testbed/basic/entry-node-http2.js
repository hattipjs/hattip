// @ts-check
import * as http2 from "node:http2";
import { createMiddleware } from "@hattip/adapter-node/http2";
import handler from "./index.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static/node";

const root = new URL("./public", import.meta.url);
const files = walk(root);

/**
 * @type {(request: http2.Http2ServerRequest, response: http2.Http2ServerResponse) => boolean}
 */
const staticMiddleware = createStaticMiddleware(root, files, { gzip: true });
const middleware = createMiddleware(handler);

http2
	.createServer((req, res) => {
		return staticMiddleware(req, res) || middleware(req, res);
	})
	.listen(3000, "127.0.0.1", () => {
		console.log("Server listening on http://127.0.0.1:3000");
	});
