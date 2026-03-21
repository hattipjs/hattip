import type { IncomingMessage, ServerResponse } from "node:http";
import { Http2ServerRequest, Http2ServerResponse } from "node:http2";
import { FastRequest } from "@hattip/fast-request-response";

export interface RequestAdapterOptions {
	useFastRequestResponse?: boolean;
	origin?: string;
	trustProxcies?: number;
}

export function createRequestAdapter(options: RequestAdapterOptions = {}) {
	const { useFastRequestResponse = true, origin, trustProxcies = 0 } = options;

	return function requestAdapter(
		req: (IncomingMessage | Http2ServerRequest) & { rawBody?: Buffer | string },
		res: ServerResponse | Http2ServerResponse,
	): Request {
		const requestOrigin = origin ?? getRequestOrigin(req, trustProxcies);
		const url = `${requestOrigin}${req.url ?? "/"}`;

		// NOTE(perf): Using a Headers object seems to be faster than creating an array first.
		const headers = new Headers();
		const rawHeaders = req.rawHeaders;
		for (let i = 0; i < rawHeaders.length; i += 2) {
			const key = rawHeaders[i]!;
			const value = rawHeaders[i + 1]!;
			// Skip pseudo-headers that start with a colon
			if (key!.charCodeAt(0) !== 0x3a) {
				headers.append(key, value);
			}
		}

		const method = req.method ?? "GET";
		const body =
			req.method === "GET" || req.method === "HEAD"
				? null
				: (req.rawBody ?? req);

		function createSignal() {
			// TODO: What happens if this is called after the close event has fired?
			const controller = new AbortController();
			req.once("close", () => controller.abort());
			res.once("close", () => controller.abort());
			return controller.signal;
		}

		if (useFastRequestResponse) {
			return new FastRequest(url, method, headers, body, createSignal);
		} else {
			return new Request(url, {
				body,
				headers,
				method,
				signal: createSignal(),
				duplex: "half",
			});
		}
	};
}

function getRequestOrigin(
	req: IncomingMessage | Http2ServerRequest,
	trustProxies: number,
): string {
	let protocol: "http" | "https" | undefined;
	let host: string | undefined;

	if (trustProxies > 0) {
		const forwardedHosts = splitHeaderValues(req.headers["x-forwarded-host"]);
		const forwardedProtos = splitHeaderValues(req.headers["x-forwarded-proto"]);

		const forwardedHost = forwardedHosts[forwardedHosts.length - trustProxies];
		const forwardedProto =
			forwardedProtos[forwardedProtos.length - trustProxies];

		host = forwardedHost;
		protocol =
			forwardedProto == "https"
				? "https"
				: forwardedProto === "http"
					? "http"
					: undefined;
	}

	protocol ??= (req.socket as any).encrypted ? "https" : "http";
	host ??= req.headers.host;

	return `${protocol}://${host}`;
}

function splitHeaderValues(value: string | string[] | undefined): string[] {
	if (!value || (typeof value === "string" && !value.trim())) {
		return [];
	}

	if (Array.isArray(value)) {
		return value.flatMap(splitHeaderValues);
	}

	return value.split(",").map((v) => v.trim());
}
