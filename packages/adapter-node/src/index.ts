import type { IncomingMessage, ServerResponse } from "http";
import { Handler } from "@hattip/core";
import { Readable } from "stream";

// node-fetch is an ESM only package. This slightly awkward dynamic import
// is required to use it in CJS.
const nodeFetchInstallPromise = import("node-fetch").then((nodeFetch) => {
	(globalThis as any).fetch = nodeFetch.default;
	(globalThis as any).Request = nodeFetch.Request;
	(globalThis as any).Headers = nodeFetch.Headers;

	class Response extends nodeFetch.Response {
		constructor(input: any, init?: any) {
			if (input instanceof ReadableStream) {
				input = Readable.from(input as any);
			}

			super(input as any, init);
		}
	}

	(globalThis as any).Response = Response;
});

type Middleware = (
	req: IncomingMessage,
	res: ServerResponse,
	next: () => void,
) => void;

export default function nodeAdapter(
	handler: Handler,
	origin: string,
): Middleware {
	return async function nodeAdapterHandler(req, res, next) {
		await nodeFetchInstallPromise;

		const request = new Request(origin + req.url, {
			method: req.method,
			headers: req.headers as Record<string, string>,
			body:
				req.method === "GET" || req.method === "HEAD"
					? undefined
					: (req as any),
		});

		const waited: Promise<any>[] = [];

		const response = await handler(request, {
			waitUntil(promise) {
				waited.push(promise);
			},
		});

		if (response) {
			const rawHeaders: Record<string, string | string[]> = (
				response.headers as any
			).raw();

			for (const [key, value] of Object.entries(rawHeaders)) {
				res.setHeader(key, value);
			}

			for await (const chunk of response.body as any) {
				res.write(chunk);
			}

			res.end();
		}

		await Promise.all(waited);

		next();
	};
}
