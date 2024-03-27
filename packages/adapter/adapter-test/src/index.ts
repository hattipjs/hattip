import type { HattipHandler } from "@hattip/core";
import installNodeFetch from "@hattip/polyfills/node-fetch";

installNodeFetch();

export interface CreateTestClientArgs<P = unknown> {
	handler: HattipHandler<P>;
	baseUrl?: string | URL;
	platform?: P;
	env?: Record<string, string>;
}

export function createTestClient<P = { name: "test" }>({
	handler,
	baseUrl,
	platform = { name: "test" } as any,
	env = Object.create(null),
}: CreateTestClientArgs<P>): typeof fetch {
	return async function fetch(input, init) {
		let request: Request;
		if (input instanceof Request) {
			request = init ? new Request(input, init) : input;
		} else {
			input = new URL(input as string | URL, baseUrl).href;
			request = new Request(input, init);
		}

		return handler({
			request,
			ip: (request.headers.get("x-forwarded-for") || "")
				.split(",", 1)[0]
				.trim(),
			platform,
			passThrough() {
				void 0;
			},
			waitUntil(promise) {
				void promise;
			},
			env(variable) {
				return env[variable];
			},
		});
	};
}
