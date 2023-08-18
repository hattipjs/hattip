import fs from "node:fs";
import path from "node:path";
import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { Serve, Server, BunFile } from "./bun-types";
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

		fetch(request: Request) {
			if (staticFiles) {
				let path = new URL(request.url).pathname;
				if (path.endsWith("/")) {
					path = path.slice(0, -1);
				}
				const fullPath = staticDir + path;

				if (staticFiles.has(path)) {
					return new Response(Bun.file(fullPath));
				} else if (staticFiles.has(path + "/index.html")) {
					return new Response(Bun.file(fullPath + "/index.html"));
				} else if (staticFiles.has(path + ".html")) {
					return new Response(Bun.file(fullPath + ".html"));
				}
			}

			const context: AdapterRequestContext<BunPlatformInfo> = {
				request,
				// TODO: How to get the IP address when not behind a proxy?
				ip: trustProxy
					? String(request.headers.get("x-forwarded-for") || "")
							.split(",", 1)[0]
							.trim()
					: "127.0.0.1",
				passThrough() {
					// No op
				},
				waitUntil() {
					// No op
				},
				platform: { name: "bun", server: this },
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

declare global {
	// eslint-disable-next-line no-var
	var Bun: {
		/**
		 * [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) powered by the fastest system calls available for operating on files.
		 *
		 * This Blob is lazy. That means it won't do any work until you read from it.
		 *
		 * - `size` will not be valid until the contents of the file are read at least once.
		 * - `type` is auto-set based on the file extension when possible
		 *
		 * @example
		 * ```js
		 * const file = Bun.file("./hello.json");
		 * console.log(file.type); // "application/json"
		 * console.log(await file.json()); // { hello: "world" }
		 * ```
		 *
		 * @example
		 * ```js
		 * await Bun.write(
		 *   Bun.file("./hello.txt"),
		 *   "Hello, world!"
		 * );
		 * ```
		 * @param path The path to the file (lazily loaded)
		 *
		 */
		// tslint:disable-next-line:unified-signatures
		file(path: string | URL, options?: BlobPropertyBag): BunFile;
	};
}
