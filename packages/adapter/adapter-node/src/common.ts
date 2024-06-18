import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import {
	createServer as createHttpServer,
	Server as HttpServer,
	IncomingMessage,
	ServerResponse,
	ServerOptions,
} from "node:http";
import type { Socket } from "node:net";
import { NodeRequestAdapterOptions, createRequestAdapter } from "./request";
import { sendResponse } from "./response";
import process from "node:process";

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
	socket?: PossiblyEncryptedSocket;
}

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = (
	req: DecoratedRequest,
	res: ServerResponse,
	next?: (err?: unknown) => void,
) => void;

/** Adapter options */
export interface NodeAdapterOptions extends NodeRequestAdapterOptions {
	/**
	 * Whether to call the next middleware in the chain even if the request
	 * was handled.@default true
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
): NodeMiddleware {
	const { alwaysCallNext = true, ...requestOptions } = options;

	const requestAdapter = createRequestAdapter(requestOptions);

	return async (req, res, next) => {
		try {
			const [request, ip] = requestAdapter(req);

			let passThroughCalled = false;

			const context = new NodeContext(request, ip, {
				name: "node",
				request: req,
				response: res,
			});

			const response = await handler(context);

			if (passThroughCalled && next) {
				next();
				return;
			}

			await sendResponse(response, res);

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

/**
 * Create an HTTP server
 */
export function createServer(
	handler: HattipHandler<NodePlatformInfo>,
	adapterOptions?: NodeAdapterOptions,
	serverOptions?: ServerOptions,
): HttpServer {
	const listener = createMiddleware(handler, adapterOptions);
	return serverOptions
		? createHttpServer(serverOptions, listener)
		: createHttpServer(listener);
}

class NodeContext implements AdapterRequestContext<NodePlatformInfo> {
	request: Request;

	ip: string;

	url: null = null;

	method = "";

	env(variable: string): string | undefined {
		return process.env[variable];
	}

	waitUntil(promise: Promise<unknown>): void {
		void promise;
	}

	passThrough(): void {
		// Do nothing
	}

	platform: NodePlatformInfo;

	constructor(request: Request, ip: string, platform: NodePlatformInfo) {
		this.request = request;
		this.ip = ip;
		this.platform = platform;
	}
}
