/// <reference types='@cloudflare/workers-types'/>

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type { CloudflareWorkersPlatformInfo } from ".";

export type { CloudflareWorkersPlatformInfo };

export default function cloudflareWorkersAdapter(
	handler: HattipHandler<CloudflareWorkersPlatformInfo>,
): ExportedHandlerFetchHandler {
	return async function fetchHandler(request, env, ctx) {
		const context: AdapterRequestContext<CloudflareWorkersPlatformInfo> = {
			request,
			ip: request.headers.get("CF-Connecting-IP") || "127.0.0.1",
			waitUntil: ctx.waitUntil.bind(ctx),
			passThrough() {
				// Do nothing
			},
			platform: {
				name: "cloudflare-workers",
				env,
				context: ctx,
			},
			env(variable) {
				const value = (env as any)[variable];
				return typeof value === "string" ? value : undefined;
			},
		};

		return handler(context);
	};
}
