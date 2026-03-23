import { RequestContext, type HattipHandler } from "@hattip/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { createRequestAdapter } from "./request.ts";
import { writeFetchResponseToNodeResponse } from "./response.ts";
import { FastResponse } from "@hattip/fast-request-response";

interface PossiblyEncryptedSocket extends Socket {
	encrypted?: boolean;
}

/**
 * `IncomingMessage` possibly augmented by Express-specific
 * `ip` and `protocol` properties.
 */
export interface DecoratedRequest extends Omit<IncomingMessage, "socket"> {
	ip?: string;
	protocol?: string;
	socket: PossiblyEncryptedSocket;
}

/** Connect/Express style request listener/middleware */
export type NodeRequestListener = (
	req: DecoratedRequest,
	res: ServerResponse,
	next?: (err?: unknown) => void,
) => void;

/** Adapter options */
export interface NodeAdapterOptions {
	/**
	 * Whether to call the next middleware in the chain even if the request
	 * was handled.@default false
	 */
	alwaysCallNext?: boolean;

	origin?: string;
	trustProxcies?: number;

	useFastRequestResponse?: boolean;
}

export interface NodePlatform {
	name: "node";
	request: DecoratedRequest;
	response: ServerResponse;
}

class NodeFastRequestContext extends RequestContext<NodePlatform> {
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

class NodeStandardRequestContext extends RequestContext<NodePlatform> {}

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createMiddleware(
	handler: HattipHandler<NodeStandardRequestContext>,
	options: NodeAdapterOptions = {},
): NodeRequestListener {
	const { alwaysCallNext = true, useFastRequestResponse = true } = options;
	const Context = useFastRequestResponse
		? NodeFastRequestContext
		: NodeStandardRequestContext;
	const requestAdapter = createRequestAdapter(options);

	return (req, res, next) => {
		function handleSuccess(response: Response) {
			writeFetchResponseToNodeResponse(response, res);

			if (next && alwaysCallNext) {
				next();
			}
		}

		function handleError(error: unknown) {
			if (next) {
				next(error);
			} else {
				console.error(error);

				if (!res.headersSent) {
					res.statusCode = 500;
				}

				if (!res.writableEnded) {
					res.end();
				}
			}
		}

		try {
			const request = requestAdapter(req, res);
			if (!request) {
				return;
			}

			const ctx = new Context(
				{
					name: "node",
					request: req,
					response: res,
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
