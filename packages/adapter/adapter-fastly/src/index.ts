/// <reference types="@fastly/js-compute"/>

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import { env } from "fastly:env";

export interface FastlyPlatformInfo {
	/** Platform name */
	name: "fastly-compute";
	/** Event object */
	event: FetchEvent;
}

export default function fastlyComputeAdapter(
	handler: HattipHandler<FastlyPlatformInfo>,
) {
	addEventListener("fetch", (event) => {
		const context: AdapterRequestContext<FastlyPlatformInfo> = {
			request: event.request,
			ip: event.client.address,
			waitUntil: event.waitUntil.bind(event),
			platform: {
				name: "fastly-compute",
				event,
			},
			passThrough() {
				// empty
			},
			env,
		};

		event.respondWith(handler(context));
	});
}
