import type * as http2 from "./http2";
import type * as http from "./http";

export type IncomingMessage = http.IncomingMessage | http2.IncomingMessage;
export type ServerResponse = http.ServerResponse | http2.ServerResponse;

export type DecoratedRequest =
	import("./common").DecoratedRequest<IncomingMessage>;

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = import("./common").NodeMiddleware<
	IncomingMessage,
	ServerResponse
>;

export type NodePlatformInfo = import("./common").NodePlatformInfo<
	IncomingMessage,
	ServerResponse
>;

/** Adapter options */
export interface NodeRequestAdapterOptions {
	/**
	 * Set the origin part of the URL to a constant value.
	 * It defaults to `process.env.ORIGIN`. If neither is set,
	 * the origin is computed from the protocol and hostname.
	 * To determine the protocol, `req.protocol` is tried first.
	 * If `trustProxy` is set, `X-Forwarded-Proto` header is used.
	 * Otherwise, `req.socket.encrypted` is used.
	 * To determine the hostname, `X-Forwarded-Host`
	 * (if `trustProxy` is set) or `Host` header is used.
	 */
	origin?: string;
	/**
	 * Whether to trust `X-Forwarded-*` headers. `X-Forwarded-Proto`
	 * and `X-Forwarded-Host` are used to determine the origin when
	 * `origin` and `process.env.ORIGIN` are not set. `X-Forwarded-For`
	 * is used to determine the IP address. The leftmost values are used
	 * if multiple values are set. Defaults to true if `process.env.TRUST_PROXY`
	 * is set to `1`, otherwise false.
	 */
	trustProxy?: boolean;
}

/** Adapter options */
export interface NodeAdapterOptions extends NodeRequestAdapterOptions {
	/**
	 * Whether to call the next middleware in the chain even if the request
	 * was handled.@default true
	 */
	alwaysCallNext?: boolean;
}
