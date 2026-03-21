import type { HttpRequest, HttpResponse } from "uWebSockets.js";
import { FastRequest } from "@hattip/fast-request-response";
import { PassThrough } from "node:stream";

export interface RequestAdapterOptions {
	useFastRequestResponse?: boolean;
	origin?: string;
	trustProxcies?: number;
}

export function createRequestAdapter(options: RequestAdapterOptions = {}) {
	const { useFastRequestResponse = true, origin, trustProxcies = 0 } = options;

	return function requestAdapter(res: HttpResponse, req: HttpRequest): Request {
		const requestOrigin = origin ?? getRequestOrigin(req, trustProxcies);

		const method = req.getCaseSensitiveMethod();
		const path = req.getUrl();

		const headers = new Headers();
		req.forEach((key, value) => {
			// TODO: Does uWebSockets really pass pseudo headers?
			// Skip pseudo-headers that start with a colon
			if (key!.charCodeAt(0) !== 0x3a) {
				headers.append(key, value);
			}
		});

		const query = req.getQuery();
		const url = requestOrigin + path + (query ? "?" + query : "");
		let aborted = false;
		let controller: AbortController | null = null;

		res.onAborted(() => {
			aborted = true;
			controller?.abort();
		});

		function createSignal() {
			if (!controller) {
				if (aborted) {
					return AbortSignal.abort();
				}

				controller = new AbortController();
			}

			return controller.signal;
		}

		const body =
			method === "GET" || method === "HEAD" ? null : new PassThrough({});

		if (body) {
			res.onData((chunk, isLast) => {
				const available = body.write(Buffer.from(chunk));
				if (isLast) {
					body.end();
				} else if (!available) {
					res.pause();
					body.once("drain", () => {
						res.resume();
					});
				}
			});
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

function getRequestOrigin(req: HttpRequest, trustProxies: number): string {
	let protocol: "http" | "https" | undefined;
	let host: string | undefined;

	if (trustProxies > 0) {
		const forwardedHosts = splitHeaderValues(req.getHeader("x-forwarded-host"));
		const forwardedProtos = splitHeaderValues(
			req.getHeader("x-forwarded-proto"),
		);

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

	protocol ??= "http"; // TODO
	host ??= req.getHeader("host");

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
