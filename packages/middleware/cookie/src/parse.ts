import "@hattip/compose";
import { parse, ParseOptions as CookieParseOptions } from "cookie";

export type { CookieParseOptions };

declare module "@hattip/compose" {
	interface RequestContextExtensions {
		/** Incoming cookies parsed into an object */
		readonly cookie: Record<string, string | undefined>;
	}
}

// Only the subset that we actually use for maximum compatibility
export type CookieParserContext = {
	request: Pick<Request, "headers">;
};

/**
 * Create a cookie parser middleware.
 *
 * @param options Cookie parser options
 *
 * @returns A middleware that will parse cookies
 */
export function cookieParser(options?: CookieParseOptions) {
	return function parseCookie(ctx: CookieParserContext) {
		// Lazily parse
		Object.defineProperty(ctx, "cookie", {
			get() {
				const value = parse(ctx.request.headers.get("cookie") || "", options);
				Object.defineProperty(ctx, "cookie", {
					value,
					configurable: true,
					enumerable: true,
				});
				return value;
			},
			configurable: true,
			enumerable: true,
		});
	};
}
