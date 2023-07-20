import { createServeHandler } from "@hattip/adapter-deno";
import hattipHandler from "./index.js";
import { walk } from "https://deno.land/std/fs/walk.ts";
import { serveDir } from "https://deno.land/std/http/file_server.ts";

const staticDir = "public";
const walker = walk(staticDir, { includeDirs: false });
const staticFiles = new Set();

for await (const entry of walker) {
	staticFiles.add(entry.path.slice(staticDir.length).replace(/\\/g, "/"));
}

const handler = createServeHandler(hattipHandler);

Deno.serve(
	async (request, connInfo) => {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (staticFiles.has(pathname)) {
			return serveDir(request, { fsRoot: staticDir });
		} else if (staticFiles.has(pathname + "/index.html")) {
			url.pathname = pathname + "/index.html";
			return serveDir(new Request(url, request), {
				fsRoot: staticDir,
			});
		}

		return handler(request, connInfo);
	},
	{ port: 3000 },
);
