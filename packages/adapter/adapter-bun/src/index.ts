import { RequestContext, type HattipHandler } from "@hattip/core";

export type BunFetchHandler = (
	request: Request,
	server: Bun.Server<undefined>,
) => Response | Promise<Response>;

export interface BunPlatform {
	name: "bun";
	server: Bun.Server<unknown>;
}

export class BunRequestContext extends RequestContext<BunPlatform> {}

export function createHandler(
	handler: HattipHandler<BunRequestContext>,
): BunFetchHandler {
	return (request, server) => {
		function createErrorResponse(error: unknown) {
			console.error(error);
			return new Response("Internal Server Error", { status: 500 });
		}

		try {
			const ctx = new BunRequestContext(
				{
					name: "bun",
					server,
				},
				request,
			);

			const response = handler(ctx);

			if (isPromiseLike(response)) {
				return response.catch(createErrorResponse);
			}

			return response;
		} catch (error) {
			return createErrorResponse(error);
		}
	};
}

function isPromiseLike(x: unknown): x is Promise<any> {
	return typeof (x as any)?.then === "function";
}
