/* eslint-disable @typescript-eslint/ban-ts-comment */
import process from "node:process";
import { Readable } from "node:stream";
import {
	DecoratedRequest,
	NodeRequestAdapterOptions,
	ServerResponse,
} from "./types";

// @ts-ignore
const isDeno = typeof Deno !== "undefined";

/** Create a function that converts a Node HTTP request into a fetch API `Request` object */
export function createRequestAdapter(
	options: NodeRequestAdapterOptions = {},
): (
	req: DecoratedRequest,
	res: ServerResponse,
) => [request: Request, ip: string] {
	const {
		origin = process.env.ORIGIN,
		trustProxy = process.env.TRUST_PROXY === "1",
	} = options;

	// eslint-disable-next-line prefer-const
	let { protocol: protocolOverride, host: hostOverride } = origin
		? new URL(origin)
		: ({} as Record<string, undefined>);

	if (protocolOverride) {
		protocolOverride = protocolOverride.slice(0, -1);
	}

	let warned = false;

	return function requestAdapter(req, res) {
		// TODO: Support the newer `Forwarded` standard header
		function parseForwardedHeader(name: string) {
			return (headers["x-forwarded-" + name] || "").split(",", 1)[0].trim();
		}

		let headers = req.headers as any;

		const ip =
			req.ip ||
			(trustProxy && parseForwardedHeader("for")) ||
			req.socket.remoteAddress ||
			"";

		const protocol =
			protocolOverride ||
			req.protocol ||
			(trustProxy && parseForwardedHeader("proto")) ||
			headers[":scheme"] ||
			(req.socket.encrypted && "https") ||
			"http";

		let host =
			hostOverride ||
			(trustProxy && parseForwardedHeader("host")) ||
			headers[":authority"] ||
			headers.host;

		if (!host && !warned) {
			console.warn(
				"Could not automatically determine the origin host, using 'localhost'. " +
					"Use the 'origin' option or the 'ORIGIN' environment variable to set the origin explicitly.",
			);
			warned = true;
			host = "localhost";
		}

		// Filter out HTTP/2 pseudo-headers
		if (headers[":method"]) {
			headers = Object.fromEntries(
				Object.entries(headers).filter(([key]) => !key.startsWith(":")),
			);
		}

		const controller = new AbortController();
		req.once("close", () => {
			if (!res.writableEnded) {
				controller.abort();
			}
		});

		const request = new Request(protocol + "://" + host + req.url, {
			method: req.method,
			headers,
			body: convertBody(req),
			signal: controller.signal,
			// @ts-expect-error: Node requires this when the body is a ReadableStream
			duplex: "half",
		});

		return [request, ip];
	};
}

function convertBody(req: DecoratedRequest): BodyInit | null | undefined {
	if (req.method === "GET" || req.method === "HEAD") {
		return;
	}

	// Needed for Google Cloud Functions and some other environments
	// that pre-parse the body.
	if (req.rawBody !== undefined) {
		return req.rawBody;
	}

	if (!isDeno) {
		// Bun and real Node can handle Readable as request body
		return req as any;
	}

	return Readable.toWeb(req) as any;
}
