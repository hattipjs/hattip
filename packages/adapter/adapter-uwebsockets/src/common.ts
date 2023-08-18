import type { HattipHandler } from "@hattip/core";
import {
	App,
	HttpRequest,
	HttpResponse,
	AppOptions,
	SSLApp,
	TemplatedApp,
} from "uWebSockets.js";

/** Adapter options */
export interface UWebSocketAdapterOptions {
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
	/** Use SSL (https) */
	ssl?: boolean;
	/** Static file directory */
	staticDir?: string;
	/**
	 * Callback to configure the uWebSockets.js app.
	 * Useful for adding WebSocket or HTTP routes before the HatTip handler
	 * is added.
	 */
	configureServer?: (app: TemplatedApp) => void;
}

export interface UWebSocketPlatformInfo {
	request: HttpRequest;
	response: HttpResponse;
}

/**
 * Create an HTTP server
 */
export function createServer(
	handler: HattipHandler,
	adapterOptions?: UWebSocketAdapterOptions,
	appOptions?: AppOptions,
) {
	const {
		origin = process.env.ORIGIN,
		trustProxy = process.env.TRUST_PROXY === "1",
		ssl = false,
		configureServer,
	} = adapterOptions || {};

	let { protocol, host } = origin
		? new URL(origin)
		: ({} as Record<string, undefined>);

	if (protocol) {
		protocol = protocol.slice(0, -1);
	}

	if (ssl && !appOptions) {
		throw new Error("SSL requires appOptions");
	}

	const app = ssl ? SSLApp(appOptions!) : appOptions ? App(appOptions) : App();

	configureServer?.(app);

	return app.any("/*", (res, req) => {
		let aborted = false;
		res.onAborted(() => (aborted = true));

		const method = req.getCaseSensitiveMethod();
		const path = req.getUrl();

		const headers = new Headers();
		req.forEach((key, value) => headers.append(key, value));

		function getForwardedHeader(name: string) {
			return (headers.get("x-forwarded-" + name) || "").split(",", 1)[0].trim();
		}

		protocol =
			protocol ||
			(trustProxy && getForwardedHeader("proto")) ||
			(ssl && "https") ||
			"http";

		const ipAddress = ipAddressBytesToString(res.getRemoteAddress());

		host =
			host ||
			(trustProxy && getForwardedHeader("host")) ||
			headers.get("host") ||
			ipAddress;

		if (!host) {
			console.warn(
				"Could not automatically determine the origin host, using 'localhost'. " +
					"Use the 'origin' option or the 'ORIGIN' environment variable to set the origin explicitly.",
			);
			host = "localhost";
		}

		const ip = (trustProxy && getForwardedHeader("for")) || ipAddress || "";

		const query = req.getQuery();
		const url = protocol + "://" + host + path + (query ? "?" + query : "");

		const responseOrPromise = handler({
			ip,
			passThrough() {
				/* Do nothing */
			},
			waitUntil() {
				/* Do nothing */
			},
			platform: {
				name: "uwebsockets",
				request: req,
				response: res,
			},
			env(variable: string) {
				return process.env[variable];
			},
			request: new Request(url, {
				method,
				headers,
				body:
					method === "GET" || method === "HEAD"
						? undefined
						: new ReadableStream({
								start(controller) {
									res.onData((chunk, isLast) => {
										const buffer = Buffer.from(chunk);
										controller.enqueue(buffer);
										if (isLast) controller.close();
									});
								},
						  }),
				// @ts-expect-error: Node requires this for streams
				duplex: "half",
			}),
		});

		if (responseOrPromise instanceof Promise) {
			responseOrPromise.then(finish);
		} else {
			finish(responseOrPromise);
		}

		async function finish(response: Response) {
			if (aborted) return;

			res.writeStatus(
				`${response.status}${
					response.statusText ? " " + response.statusText : ""
				}`,
			);

			response.headers.forEach((value, key) => {
				if (key === "set-cookie") {
					const values = response.headers.getSetCookie();
					for (const value of values) {
						res.writeHeader(key, value);
					}
				} else {
					res.writeHeader(key, value);
				}
			});

			if (response.body) {
				const reader = (response.body as any as AsyncIterable<Buffer | string>)[
					Symbol.asyncIterator
				]();

				const first = await reader.next();
				if (first.done) {
					res.end();
				} else {
					const secondPromise = reader.next();
					let second = await Promise.race([
						secondPromise,
						Promise.resolve(null),
					]);

					if (second && second.done) {
						res.end(first.value);
					} else {
						res.write(first.value);
						second = await secondPromise;
						for (; !second.done; second = await reader.next()) {
							res.write(Buffer.from(second.value));
						}
						res.end();
					}
				}
			} else {
				res.end();
			}
		}
	});
}

// Convert 4 or 16 bytes to an IPv4 or IPv6 string
function ipAddressBytesToString(bytes: ArrayBuffer) {
	let view = new DataView(bytes);
	let result = "";
	if (
		view.byteLength === 16 &&
		view.getUint32(0) === 0 &&
		view.getUint32(4) === 0 &&
		view.getUint32(8) === 0x0000ffff
	) {
		view = new DataView(bytes, 12);
	}

	if (view.byteLength === 4) {
		for (let i = 0; i < 4; i++) {
			result += view.getUint8(i);
			if (i < 3) result += ".";
		}
	} else if (view.byteLength === 16) {
		for (let i = 0; i < 16; i += 2) {
			result += view.getUint16(i).toString(16);
			if (i < 14) result += ":";
		}
	}
	return result;
}
