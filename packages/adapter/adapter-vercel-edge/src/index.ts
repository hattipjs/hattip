import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export interface VercelEdgePlatformInfo {
	name: "vercel-edge";
	event: FetchEvent;
}

export type VercelEdgeFunction = (
	request: Request,
	event: FetchEvent,
) => undefined | Response | Promise<undefined | Response>;

export default function vercelEdgeAdapter(
	handler: HattipHandler<VercelEdgePlatformInfo>,
	isMiddleware = false,
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

		if (isMiddleware && passThroughCalled) {
			return;
		}

		return response;
	};
}

export interface FetchEvent extends ExtendableEvent {
	readonly clientId: string;
	readonly handled: Promise<undefined>;
	readonly preloadResponse: Promise<any>;
	readonly request: Request;
	readonly resultingClientId: string;
	respondWith(r: Response | PromiseLike<Response>): void;
}

interface ExtendableEvent extends Event {
	waitUntil(f: Promise<any>): void;
}
