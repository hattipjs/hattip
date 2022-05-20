/// <reference types='@cloudflare/workers-types'/>
/* eslint-disable import/no-unresolved */

import { Handler, notFoundHandler, runHandler } from "@hattip/core";
import { getAssetFromKV, NotFoundError } from "@cloudflare/kv-asset-handler";
// @ts-expect-error: No typing for this
import manifest from "__STATIC_CONTENT_MANIFEST";

export default function cloudflareWorkersAdapter(
  handler: Handler,
): ExportedHandlerFetchHandler {
  return async function fetchHandler(request, env, ctx) {
    if (request.method === "GET" || request.method === "HEAD") {
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil: (promise) => context.waitUntil(promise),
          },
          {
            ASSET_NAMESPACE: (env as any).__STATIC_CONTENT,
            ASSET_MANIFEST: manifest,
          },
        );
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          console.error(error);
          return new Response("Internal Server Error", { status: 500 });
        }
      }
    }

    const context = {
      ip: request.headers.get("CF-Connecting-IP") || "",
      waitUntil: ctx.waitUntil.bind(ctx),
      next: () => notFoundHandler(request, context),
    };

    const response = await runHandler(handler, request, context);

    return response!;
  };
}
