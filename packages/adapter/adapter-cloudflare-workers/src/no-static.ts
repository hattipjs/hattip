/// <reference types='@cloudflare/workers-types'/>

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { CloudflareWorkersPlatformInfo } from ".";

export type { CloudflareWorkersPlatformInfo };

export default function cloudflareWorkersAdapter(
	handler: HattipHandler,
): ExportedHandlerFetchHandler {
	return async function fetchHandler(request, env, ctx) {
		const context: AdapterRequestContext<CloudflareWorkersPlatformInfo> = {
			request,
			ip: request.headers.get("CF-Connecting-IP") || "",
			waitUntil: ctx.waitUntil.bind(ctx),
			passThrough() {
				// TODO: Investigate if there is a way to make CFW pass through the
				// request to the origin server.
			},
			platform: { name: "cloudflare-workers", env, context: ctx },
			env(variable) {
				const value = (env as any)[variable];
				return typeof value === "string" ? value : undefined;
			},
		};

		return handler(context);
	};
}
