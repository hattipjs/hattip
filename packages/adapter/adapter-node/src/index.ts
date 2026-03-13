import type { RequestContext, HattipHandler } from "@hattip/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { createFetchRequestFromNodeRequest } from "./request";
import { writeFetchResponseToNodeResponse } from "./response";

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
}

export interface NodePlatformInfo {
	name: "node";
	request: DecoratedRequest;
	response: ServerResponse;
}

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createMiddleware(
	handler: HattipHandler<NodePlatformInfo>,
	options: NodeAdapterOptions = {},
): NodeRequestListener {
	const { alwaysCallNext = true } = options;

	return async (req, res, next) => {
		try {
			const request = createFetchRequestFromNodeRequest(req);

			const context: RequestContext<NodePlatformInfo> = {
				request,

				platform: {
					name: "node",
					request: req,
					response: res,
				},
			};

			const response = await handler(context);

			writeFetchResponseToNodeResponse(response, res);

			if (next && alwaysCallNext) {
				next();
			}
		} catch (error) {
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
	};
}
