import { RequestContext } from "@hattip/compose";
import { createServer, YogaServerOptions } from "@graphql-yoga/common";

export type { YogaServerOptions };

export function yoga<TUserContext extends Record<string, any>, TRootValue>(
  options: YogaServerOptions<RequestContext, TUserContext, TRootValue>,
) {
  const server = createServer(options);

  return async function yoga(ctx: RequestContext) {
    const clone = new Request(ctx.url.href, {
      method: ctx.method,
      body: ctx.request.body,
      headers: ctx.request.headers,
    });

    return server.handleRequest(clone, ctx);
  };
}
