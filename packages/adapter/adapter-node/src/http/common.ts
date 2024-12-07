import type { HattipHandler } from "@hattip/core";
import * as http from "node:http";
import { NodeAdapterOptions } from "../types";
import { NodePlatformInfo, Server, ServerOptions } from "../types/http";
import { createMiddleware } from "../middleware";

/**
 * Create an HTTP/1.1 server
 */
export function createServer(
	handler: HattipHandler<NodePlatformInfo>,
	adapterOptions?: NodeAdapterOptions,
	serverOptions?: ServerOptions,
): Server {
	const listener = createMiddleware(handler, adapterOptions);
	return serverOptions
		? http.createServer(serverOptions, listener)
		: http.createServer(listener);
}

export { createMiddleware } from "../middleware";

export type { NodeAdapterOptions } from "../types";
export type {
	DecoratedRequest,
	NodeMiddleware,
	NodePlatformInfo,
} from "../types/http";
