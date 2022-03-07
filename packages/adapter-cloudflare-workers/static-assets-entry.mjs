import cloudflareWorkersAdapter from "./dist/index.mjs";
import handler from "virtual:hattip:handler-entry";
import { getAssetFromKV, NotFoundError } from "@cloudflare/kv-asset-handler";

const fetchHandler = cloudflareWorkersAdapter(handler);

export default function createHandler(manifest) {
  return {
    async fetch(request, env, context) {
      if (request.method === "GET" || request.method === "HEAD") {
        try {
          return await getAssetFromKV(
            {
              request,
              waitUntil: (promise) => context.waitUntil(promise),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
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

      return fetchHandler(request, env, context);
    },
  };
}
