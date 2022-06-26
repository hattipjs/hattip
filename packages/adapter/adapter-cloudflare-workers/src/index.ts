/// <reference types='@cloudflare/workers-types'/>
/* eslint-disable import/no-unresolved */

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import { getAssetFromKV, NotFoundError } from "@cloudflare/kv-asset-handler";
// @ts-expect-error: No typing for this
import manifestText from "__STATIC_CONTENT_MANIFEST";

const manifest = JSON.parse(manifestText);

export interface CloudflareWorkersPlatformInfo {
  env: unknown;
  context: ExecutionContext;
}

export default function cloudflareWorkersAdapter(
  handler: HattipHandler,
): ExportedHandlerFetchHandler {
  return async function fetchHandler(request, env, ctx) {
    if (request.method === "GET" || request.method === "HEAD") {
      try {
        return await getAssetFromKV(
          {
            request,
            waitUntil: (promise) => ctx.waitUntil(promise),
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

    const context: AdapterRequestContext<CloudflareWorkersPlatformInfo> = {
      request,
      ip: request.headers.get("CF-Connecting-IP") || "",
      waitUntil: ctx.waitUntil.bind(ctx),
      passThrough() {
        // TODO: Investigate if there is a way to make CFW pass through the
        // request to the origin server.
      },
      platform: { env, context: ctx },
    };

    return handler(context);
  };
}
