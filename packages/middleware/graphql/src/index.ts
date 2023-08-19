import { RequestContext } from "@hattip/compose";
import { createYoga, YogaServerOptions } from "./yoga";
// eslint-disable-next-line import/export
export * from "./yoga";

export function yoga<TUserContext extends Record<string, any>>(
	options: YogaServerOptions<{ requestContext: RequestContext }, TUserContext>,
) {
	const server = createYoga(options);

	return async function yoga(ctx: RequestContext) {
		const clone = new Request(ctx.url.href, {
			method: ctx.method,
			// body: ctx.request.body,
			body:
				ctx.method === "GET" || ctx.method === "HEAD"
					? null
					: await ctx.request.arrayBuffer(),
			headers: ctx.request.headers,
			// @ts-expect-error: Node requires this for streams
			duplex: "half",
		});

		return server.handleRequest(clone, { requestContext: ctx });
	};
}
