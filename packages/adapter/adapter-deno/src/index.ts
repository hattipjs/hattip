import { RequestContext, type HattipHandler } from "@hattip/core";

export interface DenoPlatform {
	name: "deno";
	info: Deno.ServeHandlerInfo<Deno.NetAddr>;
}

export class DenoRequestContext extends RequestContext<DenoPlatform> {}

export function createHandler(
	handler: HattipHandler<DenoRequestContext>,
): Deno.ServeHandler<Deno.NetAddr> {
	return (request, info) => {
		function createErrorResponse(error: unknown) {
			console.error(error);
			return new Response("Internal Server Error", { status: 500 });
		}

		try {
			const ctx = new DenoRequestContext({ name: "deno", info }, request);

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
