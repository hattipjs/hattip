// @ts-check
import { createServer } from "@hattip/adapter-uwebsockets/native-fetch";
import { walk } from "@hattip/walk";
import handler from "./index.js";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const reader = createFileReader(root);
const staticMiddleware = createStaticMiddleware(files, reader);

createServer((ctx) => staticMiddleware(ctx) || handler(ctx)).listen(
	3000,
	(success) => {
		if (!success) {
			console.error("Failed to listen on port 3000");
			process.exit(1);
		}

		console.log("Server listening on http://127.0.0.1:3000");
	},
);
