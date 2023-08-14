import { parseHeaderValue } from "@hattip/headers";

export interface ReadOnlyFile {
	readonly path: string;
	readonly type: string;
	readonly size: number;
	readonly etag?: string;
}

export interface StaticMiddlewareOptions<C extends MinimalRequestContext> {
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
	setHeaders?(ctx: C, headers: Headers, file: ReadOnlyFile): void;
}

interface MinimalRequestContext {
	request: Request;
	method?: string;
	url?: { pathname: string };
}

export function createStaticMiddleware<C extends MinimalRequestContext>(
	files: Map<string, ReadOnlyFile>,
	read: (ctx: C, file: ReadOnlyFile) => BodyInit | Promise<BodyInit>,
	options: StaticMiddlewareOptions<MinimalRequestContext> = {},
) {
	const {
		urlRoot = "/",
		index = true,
		gzip = false,
		brotli = false,
		setHeaders,
	} = options;

	return function staticMiddleware(
		ctx: MinimalRequestContext,
	): undefined | Response | Promise<Response> {
		const method = ctx.method || ctx.request.method;
		const isHeadRequest = method === "HEAD";
		if (!isHeadRequest && method !== "GET") {
			return;
		}

		let name =
			ctx.url?.pathname || ctx.request.url.match(/\/\/[^/]+(\/[^?#]+)/)?.[1];

		if (!name?.startsWith(urlRoot)) {
			return;
		}

		name = name.slice(urlRoot.length - 1);

		function serveFile(name: string): undefined | Response | Promise<Response> {
			let file = files.get(name);
			if (!file) {
				return;
			}

			const headers = new Headers({
				"content-type": file.type,
			});

			const gzipFile = gzip && files.get(name + ".gz");
			const brotliFile = brotli && files.get(name + ".br");

			if (gzipFile || brotliFile) {
				headers.set("vary", "accept-encoding");

				const acceptEncoding = ctx.request.headers.get("accept-encoding");
				if (acceptEncoding) {
					const encodings = parseHeaderValue(acceptEncoding).map(
						(e) => e.value,
					);

					if (brotliFile && encodings.includes("br")) {
						headers.set("content-encoding", "br");
						file = brotliFile;
					} else if (gzipFile && encodings.includes("gzip")) {
						headers.set("content-encoding", "gzip");
						file = gzipFile;
					}
				}
			}

			if (file.etag && ctx.request.headers.get("if-none-match") === file.etag) {
				return new Response(null, { status: 304 });
			}

			headers.set("content-length", file.size.toString());

			if (file.etag) {
				headers.set("etag", file.etag);
			}

			setHeaders?.(ctx, headers, file);

			if (isHeadRequest) {
				return new Response(null, { status: 200, headers });
			}

			const content = read(ctx as C, file);
			if (content instanceof Promise) {
				return content.then((content) => {
					return new Response(content, { status: 200, headers });
				});
			}

			return new Response(content, { status: 200, headers });
		}

		return (
			serveFile(name) || (index && serveFile(name + "/index.html")) || undefined
		);
	};
}

export function filesFromManifest(
	manifest: Array<
		[
			name: string,
			path: string | undefined,
			type: string,
			size: number,
			etag?: string,
		]
	>,
): Map<string, ReadOnlyFile> {
	return new Map(
		manifest.map(([name, path = name, type, size, etag]) => [
			name,
			{
				path,
				type,
				size,
				etag,
			},
		]),
	);
}
