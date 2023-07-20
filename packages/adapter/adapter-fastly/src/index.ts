/// <reference types="@fastly/js-compute"/>

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import { env } from "fastly:env";

export interface FastlyPlatformInfo {
	name: "fastly-compute";
	client: ClientInfo;
}

export interface Geo {
	city?: string;
	country?: {
		code?: string;
		name?: string;
	};
	subdivision?: {
		code?: string;
		name?: string;
	};
}

export default function fastlyComputeAdapter(handler: HattipHandler) {
	addEventListener("fetch", (event) => {
		const context: AdapterRequestContext<FastlyPlatformInfo> = {
			request: event.request,
			ip: event.client.address,
			waitUntil: event.waitUntil.bind(event),
			platform: {
				name: "fastly-compute",
				client: event.client,
			},
			passThrough() {
				// empty
			},
			env,
		};

		event.respondWith(handler(context));
	});
}
