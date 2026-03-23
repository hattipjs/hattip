import type { IncomingMessage, ServerResponse } from "node:http";
import { Http2ServerRequest, Http2ServerResponse } from "node:http2";
import { FastRequest } from "@hattip/fast-request-response";

export interface RequestAdapterOptions {
	useFastRequestResponse?: boolean;
	origin?: string;
	trustProxies?: number;
}

/*
    RFC 3986 bans square brackets, vertical bar, and caret but
    WhatWG URL standard allows them. Still:
    - Chrome, Firefox, and newer Safari escape caret
    - Chrome also escapes vertical bar
    - Older Chrome didn't allow %00
	We'll escape caret and vertical for compatibility
*/

// ", #, %, <, >, [, \, ], ^, `, {, |, 0x00..0x20, and >=0x7f
// We'll allow %, [, ], and | because popular browsers don't escape them (Chrome does escape |).
// Older Safaris didn't escape ^ either.
// And backslash since it's supposed to be normalized to /.
const DISALLOWED_IN_ORIGIN_FORM_REQUEST_TARGET =
	// eslint-disable-next-line no-control-regex
	/["#<>^`{|\x00-\x20\x7f-\uffff]/;

export function createRequestAdapter(options: RequestAdapterOptions = {}) {
	const { useFastRequestResponse = true, origin, trustProxies = 0 } = options;

	return function requestAdapter(
		req: (IncomingMessage | Http2ServerRequest) & { rawBody?: Buffer | string },
		res: ServerResponse | Http2ServerResponse,
	): Request | null {
		function badRequest() {
			res.statusCode = 400;
			res.end();
			return null;
		}

		const method = req.method ?? "GET";
		let requestTarget = req.url ?? "/";
		let url: string | undefined;

		if (requestTarget.charCodeAt(0) === 0x2f) {
			// origin-form
			if (DISALLOWED_IN_ORIGIN_FORM_REQUEST_TARGET.test(requestTarget)) {
				return badRequest();
			}
			console.log("Allowed");
		} else if (
			requestTarget.startsWith("http://") ||
			requestTarget.startsWith("https://")
		) {
			// absolute-form
			url = requestTarget; // TODO: Normalize/validate
		} else if (requestTarget === "*" && method === "OPTIONS") {
			// asterisk-form (used for OPTIONS requests)
			requestTarget = "/*";
		} else {
			// authority-form (used for CONNECT requests) or invalid
			// TODO: Hattip cannot handle CONNECT requests, it should be handled before this adapter
			return badRequest();
		}

		if (!url) {
			const requestOrigin = origin ?? getRequestOrigin(req, trustProxies);
			// TODO: Normalize/validate the URL
			url = `${requestOrigin}${requestTarget}`;
		}

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

		const body =
			req.method === "GET" || req.method === "HEAD"
				? null
				: (req.rawBody ?? req);

		let controller: AbortController | null = null;
		let isAborted: boolean = false;
		let abortReason: any = null;

		req.once("close", () => {
			if (!res.writableEnded) {
				const exception = new DOMException("Request closed", "AbortError");
				if (!controller) {
					isAborted = true;
					abortReason = exception;
				} else {
					controller.abort(exception);
				}
			}
		});

		req.once("error", (error) => {
			if (!res.writableEnded) {
				if (!controller) {
					isAborted = true;
					abortReason = error;
				} else {
					controller.abort(error);
				}
			}
		});

		function createSignal() {
			if (controller) {
				return controller.signal;
			}

			if (isAborted) {
				return AbortSignal.abort(abortReason);
			}

			controller = new AbortController();
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

	// TODO: :scheme should take precedence
	protocol ??= (req.socket as any).encrypted ? "https" : "http";
	// TODO :authority should take precedence
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

const SAFE_HOST_NAME_RE = /^([a-z0-9.-]+)(?::([0-9]*)?)?$/;
function isSafeHost(
	scheme: "http" | "https",
	host: string,
): [hostname: string, port: string] | null {
	const match = host.match(SAFE_HOST_NAME_RE);
	if (!match) {
		return null;
	}

	const [, hostname, unnormalizedPort] = match as [string, string, string?];

	// Validate IPv4 address
	const ipv4Match = hostname.match(
		/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
	);

	if (ipv4Match) {
		const [, ...octets] = ipv4Match;
		for (const octet of octets) {
			if (octet.length > 1 && octet.charCodeAt(0) === 0x30) {
				// We disallow leading zeros
				return null;
			}
		}
	}

	// Normalize port
	let port = unnormalizedPort ?? "";
	if (unnormalizedPort) {
		const portNumber = Number(unnormalizedPort);
		if (portNumber > 65535) {
			return null;
		}

		if (DEFAULT_PORTS[scheme] === portNumber) {
			port = "";
		} else {
			port = String(portNumber);
		}
	}

	return [hostname.toLowerCase(), port];
}

// ", #, %, <, >, [, \, ], ^, `, {, |, 0x00..0x20, and >=0x7f
// We'll allow %, [, ], and | because popular browsers don't escape them (Chrome does escape |).
// Older Safaris didn't escape ^ either.
// And backslash since it's supposed to be normalized to /.
const RISKY_ORIGIN_FORM_REQUEST_TARGET_RE =
	// eslint-disable-next-line no-control-regex
	/["#<>^`{|}\x00-\x20\x7f-\uffff]/;
function isSafeOriginFormRequestTarget(
	requestTarget: string,
): [pathname: string, search: string] | null {
	let pathname: string;
	let search: string;
	const searchIndex = requestTarget.indexOf("?");
	if (searchIndex === -1) {
		pathname = requestTarget;
		search = "";
	} else {
		pathname = requestTarget.slice(0, searchIndex);
		search = requestTarget.slice(searchIndex);
	}
}

const DEFAULT_PORTS = {
	http: 80,
	https: 443,
};

function createUrl(
	scheme: string,
	host: string,
	requestTarget: string,
): string {
	// Slow path
	const url = new URL(`${scheme}://${host}${requestTarget}`);
	return url.toString();
}

interface UrlLike {
	readonly href: string; // "http://username:password@hostname:3000/path?query" = protocol + "//" + hostname
	readonly origin: string; // "http://hostname:3000" = protocol + "//" + hostname
	readonly host: string; // "hostname:3000" = hostname + (":" + port)
	readonly protocol: string; // "http:"
	readonly username: string; // "username"
	readonly password: string; // "password"
	readonly hostname: string; // "hostname"
	readonly port: string; // "3000"
	readonly pathname: string; // "/path"
	readonly search: string; // "?query"
	// [SameObject]
	// readonly searchParams: ReadonlySearchParams;

	toJSON(): string;
	toString(): string;
}

class ReadonlyUrl implements UrlLike {
	readonly href: string;
	readonly origin: string;
	readonly host: string;
	readonly protocol: string;
	readonly username: string;
	readonly password: string;
	readonly hostname: string;
	readonly port: string;
	readonly pathname: string;
	readonly search: string;

	constructor(
		scheme: string,
		hostname: string,
		port: string,
		pathname: string,
		search: string,
	) {
		this.protocol = scheme + ":";

		const hostMatch = isSafeHost(scheme as "http" | "https", hostHeaderValue);
	}
}
