/// <reference types='@cloudflare/workers-types'/>

import { Handler } from "@hattip/core";

export default function cloudflareWorkersAdapter(
  handler: Handler,
): ExportedHandlerFetchHandler {
  return async function fetchHandler(request, env, ctx) {
    const response = await handler(request, ctx);

    return response || new Response(null, { status: 404 });
  };
}
