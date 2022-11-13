import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export interface NetlifyEdgePlatformInfo {
	ip: string | null;
	cookies: Cookies;
	geo: Geo;
	json(input: unknown, init?: ResponseInit): Response;
	log(...data: unknown[]): void;
	rewrite(url: string | URL): Promise<Response>;
	next(options?: NextOptions): Promise<Response>;
}

export interface Cookies {
	get(name: string): Record<string, string>;
	set(cookie: Cookie): void;
	delete(input: string | DeleteCookieOptions): void;
}

export interface NextOptions {
	sendConditionalRequest?: boolean;
}

export interface Geo {
	city?: string;
	country?: {
		code?: string;
		name?: string;
	};
	subdivision?: {
		code?: string;
		name?: string;
	};
}

// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// Structured similarly to Go's cookie.go
// https://github.com/golang/go/blob/master/src/net/http/cookie.go
export interface Cookie {
	/** Name of the cookie. */
	name: string;
	/** Value of the cookie. */
	value: string;
	/** Expiration date of the cookie. */
	expires?: Date;
	/** Max-Age of the Cookie. Max-Age must be an integer superior or equal to 0. */
	maxAge?: number;
	/** Specifies those hosts to which the cookie will be sent. */
	domain?: string;
	/** Indicates a URL path that must exist in the request. */
	path?: string;
	/** Indicates if the cookie is made using SSL & HTTPS. */
	secure?: boolean;
	/** Indicates that cookie is not accessible via JavaScript. */
	httpOnly?: boolean;
	/**
	 * Allows servers to assert that a cookie ought not to
	 * be sent along with cross-site requests.
	 */
	sameSite?: "Strict" | "Lax" | "None";
	/** Additional key value pairs with the form "key=value" */
	unparsed?: string[];
}

export interface DeleteCookieOptions {
	domain?: string;
	name: string;
	path?: string;
}

export type NetlifyEdgeFunction = (
	request: Request,
	info: NetlifyEdgePlatformInfo,
) => Response | undefined | Promise<Response | undefined>;

export default function netlifyEdgeAdapter(
	handler: HattipHandler,
): NetlifyEdgeFunction {
	return async function fetchHandler(request, info) {
		let passThroughCalled = false;

		const context: AdapterRequestContext<NetlifyEdgePlatformInfo> = {
			request,
			ip: info.ip || "",
			waitUntil() {
				// No op
			},
			passThrough() {
				passThroughCalled = true;
			},
			platform: info,
		};

		const response = await handler(context);

		// TODO: Real middleware support
		if (passThroughCalled) {
			return;
		}

		return response;
	};
}
