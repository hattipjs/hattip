/// <reference types="bun-types" />

import fs from "node:fs";
import path from "node:path";
import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { Serve, Server } from "bun";
import process from "node:process";

export type BunAdapterOptions = Omit<Serve, "fetch" | "error"> & {
	staticDir?: string;
	trustProxy?: boolean;
};

export interface BunPlatformInfo {
	/** Platform name */
	name: "bun";
	/** Bun server instance */
	server: Server;
}

export default function bunAdapter(
	handler: HattipHandler<BunPlatformInfo>,
	options: BunAdapterOptions = {},
): Serve {
	const { staticDir, trustProxy, ...remaingOptions } = options;

	let staticFiles: Set<string>;
	if (staticDir) {
		staticFiles = walk(staticDir);
	}

	return {
		...remaingOptions,

		fetch(request: Request, server: Server) {
			if (staticFiles) {
				let path = new URL(request.url).pathname;
				if (path.endsWith("/")) {
					path = path.slice(0, -1);
				}
				const fullPath = staticDir + path;

				if (staticFiles.has(path)) {
					return new Response(Bun.file(fullPath) as any);
				} else if (staticFiles.has(path + "/index.html")) {
					return new Response(Bun.file(fullPath + "/index.html") as any);
				} else if (staticFiles.has(path + ".html")) {
					return new Response(Bun.file(fullPath + ".html") as any);
				}
			}

			const context: AdapterRequestContext<BunPlatformInfo> = {
				request,
				ip: trustProxy
					? String(request.headers.get("x-forwarded-for") || "")
							.split(",", 1)[0]
							.trim()
					: (server.requestIP(request)?.address ?? "127.0.0.1"),
				passThrough() {
					// No op
				},
				waitUntil() {
					// No op
				},
				platform: { name: "bun", server },
				env(variable: string) {
					return process.env[variable];
				},
			};

			return handler(context);
		},

		error(error) {
			console.error(error);
			return new Response("Internal Server Error", { status: 500 });
		},
	};
}

function walk(
	dir: string,
	root = dir,
	entries = new Set<string>(),
): Set<string> {
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filepath = path.join(dir, file);
		const stat = fs.statSync(filepath);
		if (stat.isDirectory()) {
			walk(filepath, root, entries);
		} else {
			entries.add("/" + path.relative(root, filepath).replace(/\\/g, "/"));
		}
	}

	return entries;
}
