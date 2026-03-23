import { RequestContext, type HattipHandler } from "@hattip/core";

export interface FastlyPlatform {
	name: "fastly";
	event: FetchEvent;
}

export class FastlyRequestContext extends RequestContext<FastlyPlatform> {}

export function createHandler(
	handler: HattipHandler<FastlyRequestContext>,
): (event: FetchEvent) => Response | Promise<Response> {
	return (event) => {
		const ctx = new FastlyRequestContext(
			{
				name: "fastly",
				event,
			},
			event.request,
		);

		return handler(ctx);
	};
}
