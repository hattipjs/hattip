import "@hattip/compose";
import type { RequestContext } from "@hattip/compose";
import { serialize, SerializeOptions as CookieSerializeOptions } from "cookie";

declare module "@hattip/compose" {
	interface RequestContextExtensions {
		/**
		 * Outgoing cookies that will be added to the response. Typically you
		 * shouldn't need touch this.
		 */
		outgoingCookies: Array<{
			name: string;
			value: string;
			options?: CookieSerializeOptions;
		}>;
		/**
		 * Set a cookie.
		 *
		 * @param name    The name of the cookie
		 * @param value   The value of the cookie
		 * @param options Options for the cookie
		 */
		setCookie(
			name: string,
			value: string,
			options?: CookieSerializeOptions,
		): void;
		/**
		 * Delete a cookie.
		 *
		 * @param name    The name of the cookie
		 * @param options Options for the cookie
		 */
		deleteCookie(name: string, options?: CookieSerializeOptions): void;
	}
}

export type { CookieSerializeOptions };

// Only the subset that we actually use for maximum compatibility
export type CookieSerializerContext = Pick<
	RequestContext,
	"outgoingCookies" | "setCookie" | "deleteCookie" | "next"
>;

/**
 * Create a cookie serializer middleware.
 *
 * @param defaultOptions Default options for the cookie serializer
 *
 * @returns A middleware that will serialize cookies
 */
export function cookieSerializer(defaultOptions?: CookieSerializeOptions) {
	return async function serializeCookie(ctx: CookieSerializerContext) {
		ctx.outgoingCookies = [];

		ctx.setCookie = (name, value, options) => {
			ctx.outgoingCookies.push({
				name,
				value,
				options: { ...defaultOptions, ...options },
			});
		};

		ctx.deleteCookie = (name, options) => {
			ctx.outgoingCookies.push({
				name,
				value: "",
				options: {
					...defaultOptions,
					...options,
					maxAge: 0,
				},
			});
		};

		const response: Response = await ctx.next();

		for (const { name, value, options } of ctx.outgoingCookies) {
			response.headers.append("set-cookie", serialize(name, value, options));
		}

		return response;
	};
}
