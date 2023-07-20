import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export interface VercelEdgePlatformInfo {
	name: "vercel-edge";
	event: FetchEvent;
}

type FetchEventCopy = FetchEvent;
export type { FetchEventCopy as FetchEvent };

export type VercelEdgeFunction = (
	request: Request,
	event: FetchEvent,
) => Response | Promise<Response>;

export default function vercelEdgeAdapter(
	handler: HattipHandler,
): VercelEdgeFunction {
	return async function vercelEdgeFunction(request, event) {
		let passThroughCalled = false;

		const context: AdapterRequestContext<VercelEdgePlatformInfo> = {
			request,
			// TODO: Support the newer `Forwarded` standard header
			ip: (request.headers.get("x-forwarded-for") || "")
				.split(",", 1)[0]
				.trim(),
			waitUntil: event.waitUntil.bind(event),
			passThrough() {
				passThroughCalled = true;
			},
			platform: {
				name: "vercel-edge",
				event,
			},
			env(variable) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				return process.env[variable];
			},
		};

		const response = await handler(context);

		if (passThroughCalled) {
			response.headers.set("x-middleware-next", "1");
		}

		return response;
	};
}
