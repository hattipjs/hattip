// @ts-check
import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static/node";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const staticMiddleware = createStaticMiddleware(root, files, { gzip: true });
const middleware = createMiddleware(handler);

createServer((req, res) => {
	staticMiddleware(req, res) || middleware(req, res);
}).listen(3000, "127.0.0.1", () => {
	console.log("Server listening on http://127.0.0.1:3000");
});
