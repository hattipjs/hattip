import { IncomingMessage } from "node:http";
import { DecoratedRequest } from "./common";
import { NodeRequestAdapterOptions } from "./request";

const NODE_REQUEST_KEY = Symbol("nodeRequest");
const URL_KEY = Symbol("url");
const CACHED_HEADERS_KEY = Symbol("cachedHeaders");

interface HattipFastRequest extends Request {
	[NODE_REQUEST_KEY]: DecoratedRequest;
	[URL_KEY]: string;
	[CACHED_HEADERS_KEY]: Headers | undefined;
}

const HattipFastRequestPrototype = {
	get url(): string {
		return this[URL_KEY];
	},

	get method(): string {
		return this[NODE_REQUEST_KEY].method ?? "GET";
	},

	get headers(): Headers {
		if (!this[CACHED_HEADERS_KEY]) {
			this[CACHED_HEADERS_KEY] = createHeaders(this[NODE_REQUEST_KEY].headers);
		}

		return this[CACHED_HEADERS_KEY]!;
	},
} as HattipFastRequest;

Object.setPrototypeOf(HattipFastRequestPrototype, Request.prototype);

let warned = false;

export function createFastRequest(
	req: DecoratedRequest,
	protocolOverride: string | undefined,
	hostOverride: string | undefined,
	trustProxy: boolean,
): Request {
	const result: HattipFastRequest = Object.create(HattipFastRequestPrototype);

	function parseForwardedHeader(name: string) {
		let value = req.headers["x-forwarded-" + name];
		if (Array.isArray(value)) {
			value = value[0];
		}

		return (value || "").split(",", 1)[0].trim();
	}

	const ip =
		req.ip ||
		(trustProxy && parseForwardedHeader("for")) ||
		req.socket?.remoteAddress ||
		"";

	const protocol =
		protocolOverride ||
		req.protocol ||
		(trustProxy && parseForwardedHeader("proto")) ||
		(req.socket?.encrypted && "https") ||
		"http";

	let host =
		hostOverride ||
		(trustProxy && parseForwardedHeader("host")) ||
		req.headers.host;

	if (!host && !warned) {
		console.warn(
			"Could not automatically determine the origin host, using 'localhost'. " +
				"Use the 'origin' option or the 'ORIGIN' environment variable to set the origin explicitly.",
		);
		warned = true;
		host = "localhost";
	}

	result[NODE_REQUEST_KEY] = req;
	result[URL_KEY] = protocol + "://" + host + req.url;

	return result;
}
