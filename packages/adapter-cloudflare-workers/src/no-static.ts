/// <reference types='@cloudflare/workers-types'/>

import {
  compose,
  HandlerStack,
  notFoundHandler,
  runHandler,
} from "@hattip/core";

export default function cloudflareWorkersAdapter(
  handlerStack: HandlerStack,
): ExportedHandlerFetchHandler {
  const handler = compose(handlerStack);

  return async function fetchHandler(request, env, ctx) {
    const context = {
      ip: request.headers.get("CF-Connecting-IP") || "",
      waitUntil: ctx.waitUntil.bind(ctx),
      next: () => notFoundHandler(request, context),
    };

    const response = await runHandler(handler, request, context);

    return response!;
  };
}
