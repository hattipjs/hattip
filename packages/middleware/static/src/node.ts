import { parseHeaderValue } from "@hattip/headers";
import { createReadStream } from "node:fs";
import type * as http from "node:http";
import type * as http2 from "node:http2";
import { fileURLToPath } from "node:url";

export interface ReadOnlyFile {
	readonly path: string;
	readonly type: string;
	readonly size: number;
	readonly etag?: string;
}

type IncomingMessage = http.IncomingMessage | http2.Http2ServerRequest;
type ServerResponse = http.ServerResponse | http2.Http2ServerResponse;

export interface StaticMiddlewareOptions<
	NodeRequest extends IncomingMessage,
	NodeResponse extends ServerResponse,
> {
	/**
	 * The URL path to serve files from. It must start and end with a slash.
	 * @default "/"
	 */
	urlRoot?: string;
	/**
	 * Whether to serve index.html files for directories.
	 * @default true
	 */
	index?: boolean;
	/**
	 * Whether to use precompressed GZip files (*.gz).
	 * @default false
	 */
	gzip?: boolean;
	/**
	 * Whether to use precompressed Brotli files (*.br).
	 * @default false
	 */
	brotli?: boolean;
	/**
	 * Callback function to set custom headers.
	 */
	setHeaders?(req: NodeRequest, res: NodeResponse, file: ReadOnlyFile): void;
}

export function createStaticMiddleware<
	NodeRequest extends IncomingMessage = http.IncomingMessage,
	NodeResponse extends ServerResponse = http.ServerResponse,
>(
	root: string | URL,
	files: Map<string, ReadOnlyFile>,
	options: StaticMiddlewareOptions<NodeRequest, NodeResponse> = {},
) {
	if (root instanceof URL || root.startsWith("file://")) {
		root = fileURLToPath(root);
	}

	const {
		urlRoot = "/",
		index = true,
		gzip = false,
		brotli = false,
		setHeaders,
	} = options;

	return function staticMiddleware(
		req: NodeRequest,
		res: NodeResponse,
	): boolean {
		const method = req.method;
		const isHeadRequest = method === "HEAD";
		if (!isHeadRequest && method !== "GET") {
			return false;
		}

		let name = req.url?.match(/^([^?#]+)/)?.[1];

		if (!name?.startsWith(urlRoot)) {
			return false;
		}

		name = name.slice(urlRoot.length - 1);

		function serveFile(name: string): boolean {
			let file = files.get(name);
			if (!file) {
				return false;
			}

			res.setHeader("content-type", file.type);

			const gzipFile = gzip && files.get(name + ".gz");
			const brotliFile = brotli && files.get(name + ".br");

			if (gzipFile || brotliFile) {
				res.setHeader("vary", "accept-encoding");

				const acceptEncoding = req.headers["accept-encoding"];
				if (acceptEncoding) {
					const encodings = parseHeaderValue(String(acceptEncoding)).map(
						(e) => e.value,
					);

					if (brotliFile && encodings.includes("br")) {
						res.setHeader("content-encoding", "br");
						file = brotliFile;
					} else if (gzipFile && encodings.includes("gzip")) {
						res.setHeader("content-encoding", "gzip");
						file = gzipFile;
					}
				}
			}

			if (file.etag && req.headers["if-none-match"] === file.etag) {
				res.writeHead(304);
				res.end();
				return true;
			}

			if (file.etag) {
				res.setHeader("etag", file.etag);
			}

			setHeaders?.(req, res, file);

			if (isHeadRequest) {
				res.writeHead(200);
				res.end();
				return true;
			}

			const content = createReadStream(root + file.path);
			content.pipe(res);

			return true;
		}

		return serveFile(name) || (index && serveFile(name + "/index.html"));
	};
}
