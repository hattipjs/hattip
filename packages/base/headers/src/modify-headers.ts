/**
 * Tries to modify the headers of a response, and, if it fails,
 * creates a mutable copy of the response and tries again.
 *
 * The problem that this function solves is that some responses
 * have immutable headers and there is no way to know this without
 * trying to modify them. This function solves this problem by
 * trying to modify the headers and, if it fails, creating a copy
 * of the response with the same body and headers and trying again.
 *
 * Usage:
 *
 * ```ts
 * app.use(async (ctx) => {
 *   let response = await ctx.next();
 *   response = modifyHeaders(response, (headers) => {
 *     headers.set("X-Powered-By", "Hattip");
 *   });
 *
 *   return response;
 * });
 * ```
 *
 * @param response Response object to be modified
 * @param modify Callback to modify the headers
 *
 * @returns a Response object with modified headers. It will be
 * the same object as the argument if its headers are mutable,
 * otherwise it will be a copy of the original.
 */
export function modifyHeaders(
	response: Response,
	modify: (headers: Headers) => void,
): Response {
	try {
		modify(response.headers);
		return response;
	} catch {
		const clone = new Response(response.body, response);
		modify(clone.headers);
		return clone;
	}
}
