import type { HattipHandler } from "@hattip/core";
import installNodeFetch from "@hattip/polyfills/node-fetch";

installNodeFetch();

export interface CreateTestClientArgs {
	handler: HattipHandler;
	baseUrl?: string | URL;
	platform?: any;
}

export function createTestClient({
	handler,
	baseUrl,
	platform = { name: "test" },
}: CreateTestClientArgs): typeof fetch {
	return async function fetch(input, init) {
		let request: Request;
		if (input instanceof Request) {
			request = init ? new Request(input, init) : input;
		} else {
			input = new URL(input, baseUrl).href;
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
		});
	};
}
