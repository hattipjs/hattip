/// <reference types='@cloudflare/workers-types'/>

import { Handler, notFoundHandler, runHandler } from "@hattip/core";

export default function cloudflareWorkersAdapter(
  handler: Handler,
): ExportedHandlerFetchHandler {
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
