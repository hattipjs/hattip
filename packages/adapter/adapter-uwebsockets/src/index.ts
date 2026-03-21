import { RequestContext, type HattipHandler } from "@hattip/core";
import type { HttpResponse, HttpRequest } from "uWebSockets.js";
import { createRequestAdapter } from "./request.ts";
import { FastResponse } from "@hattip/fast-request-response";
import { writeFetchResponseToUwsResponse } from "./response.ts";

export interface UWebsocketsAdapterOptions {
	useFastRequest?: boolean;
	origin?: string;
	trustProxcies?: number;

	useFastRequestResponse?: boolean;
}

export interface UWebSocketsPlatform {
	name: "uwebsockets";
	response: HttpResponse;
	request: HttpRequest;
}

class UWebSocketsFastRequestContext extends RequestContext<UWebSocketsPlatform> {
	override response(
		body: ConstructorParameters<typeof FastResponse>[0],
		init: ResponseInit,
	) {
		return new FastResponse(body, init);
	}

	override json(data: any, init: ResponseInit) {
		return FastResponse.json(data, init);
	}
}

class UWebSocketsStandardRequestContext extends RequestContext<UWebSocketsPlatform> {}

export function createHandler(
	handler: HattipHandler<UWebSocketsStandardRequestContext>,
	options: UWebsocketsAdapterOptions = {},
): (res: HttpResponse, req: HttpRequest) => void | Promise<void> {
	const { useFastRequestResponse = true } = options;
	const Context = useFastRequestResponse
		? UWebSocketsFastRequestContext
		: UWebSocketsStandardRequestContext;
	const requestAdapter = createRequestAdapter(options);

	return (res, req) => {
		function handleSuccess(response: Response) {
			writeFetchResponseToUwsResponse(response, res);
		}

		function handleError(error: unknown) {
			console.error(error);
		}

		try {
			const request = requestAdapter(res, req);

			const ctx = new Context(
				{
					name: "uwebsockets",
					response: res,
					request: req,
				},
				request,
			);

			const response = handler(ctx);

			if (isPromiseLike(response)) {
				response.then(handleSuccess).catch(handleError);
				return;
			}

			handleSuccess(response);
		} catch (error) {
			handleError(error);
		}
	};
}

function isPromiseLike(x: unknown): x is Promise<any> {
	return typeof (x as any)?.then === "function";
}
