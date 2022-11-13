import { RequestContext } from "@hattip/compose";

/** CORS middleware */
export function cors(options: CorsOptions = {}) {
	const defaults = {
		allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
		secureContext: false,
	};

	options = {
		...defaults,
		...options,
	};

	if (Array.isArray(options.exposeHeaders)) {
		options.exposeHeaders = options.exposeHeaders.join(",");
	}

	if (Array.isArray(options.allowMethods)) {
		options.allowMethods = options.allowMethods.join(",");
	}

	if (Array.isArray(options.allowHeaders)) {
		options.allowHeaders = options.allowHeaders.join(",");
	}

	const maxAge = options.maxAge && String(options.maxAge);

	return async function cors(ctx: RequestContext) {
		const requestOrigin = ctx.request.headers.get("Origin");

		if (!requestOrigin) {
			const response = await ctx.next();
			response.headers.append("Vary", "Origin");
			return response;
		}

		let origin: string | false;
		if (typeof options.origin === "function") {
			origin = await options.origin(ctx);
			if (!origin) return;
		} else {
			origin = options.origin || requestOrigin;
		}

		let credentials;
		if (typeof options.credentials === "function") {
			credentials = options.credentials(ctx);
			if (credentials instanceof Promise) credentials = await credentials;
		} else {
			credentials = !!options.credentials;
		}

		const response =
			ctx.method === "OPTIONS"
				? new Response(null, { status: 204 })
				: await ctx.next();

		response.headers.append("Vary", "Origin");

		const headersSet: Record<string, string | string[]> = {};

		function set(key: string, value: string | string[]) {
			if (Array.isArray(value)) {
				for (const v of value) {
					response.headers.append(key, v);
				}
			} else {
				response.headers.set(key, value);
			}
			headersSet[key] = value;
		}

		if (ctx.method !== "OPTIONS") {
			// Simple Cross-Origin Request, Actual Request, and Redirects
			set("Access-Control-Allow-Origin", origin);

			if (credentials === true) {
				set("Access-Control-Allow-Credentials", "true");
			}

			if (options.exposeHeaders) {
				set("Access-Control-Expose-Headers", options.exposeHeaders);
			}

			if (options.secureContext) {
				set("Cross-Origin-Opener-Policy", "same-origin");
				set("Cross-Origin-Embedder-Policy", "require-corp");
			}
		} else {
			// Preflight Request

			// If there is no Access-Control-Request-Method header or if parsing failed,
			// do not set any additional headers and terminate this set of steps.
			// The request is outside the scope of this specification.
			if (!ctx.request.headers.get("Access-Control-Request-Method")) {
				// this not preflight request, ignore it
				return;
			}

			set("Access-Control-Allow-Origin", origin);

			if (credentials === true) {
				set("Access-Control-Allow-Credentials", "true");
			}

			if (maxAge) {
				set("Access-Control-Max-Age", String(options.maxAge));
			}

			if (
				options.privateNetworkAccess &&
				ctx.request.headers.get("Access-Control-Request-Private-Network")
			) {
				set("Access-Control-Allow-Private-Network", "true");
			}

			if (options.allowMethods) {
				set("Access-Control-Allow-Methods", options.allowMethods);
			}

			if (options.secureContext) {
				set("Cross-Origin-Opener-Policy", "same-origin");
				set("Cross-Origin-Embedder-Policy", "require-corp");
			}

			let allowHeaders = options.allowHeaders || null;
			if (!allowHeaders) {
				allowHeaders = ctx.request.headers.get(
					"Access-Control-Request-Headers",
				);
			}

			if (allowHeaders) {
				set("Access-Control-Allow-Headers", allowHeaders);
			}
		}

		return response;
	};
}

export interface CorsOptions {
	/** `Access-Control-Allow-Origin`, default is request Origin header */
	origin?:
		| string
		| ((ctx: RequestContext) => string | false | Promise<string | false>);
	/** `Access-Control-Allow-Methods`, default is 'GET,HEAD,PUT,POST,DELETE,PATCH' */
	allowMethods?: string | string[] | null;
	/** `Access-Control-Expose-Headers` */
	exposeHeaders?: string | string[];
	/** `Access-Control-Allow-Headers` */
	allowHeaders?: string | string[];
	/** `Access-Control-Max-Age` in seconds */
	maxAge?: string | number;
	/** `Access-Control-Allow-Credentials` */
	credentials?: boolean | ((ctx: RequestContext) => boolean | Promise<boolean>);
	/**
	 * `Cross-Origin-Opener-Policy` & `Cross-Origin-Embedder-Policy` headers.',
	 * default is false.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes
	 */
	secureContext?: boolean;
	/**
	 * Handle `Access-Control-Request-Private-Network` request by return `Access-Control-Allow-Private-Network`, default to false
	 * @see https://wicg.github.io/private-network-access/
	 */
	privateNetworkAccess?: boolean;
}
