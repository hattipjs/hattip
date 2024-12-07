import type { HattipHandler } from "@hattip/core";
import * as http2 from "node:http2";
import { NodeAdapterOptions } from "../types";
import {
	IncomingMessage,
	NodePlatformInfo,
	Server,
	ServerOptions,
	ServerResponse,
} from "../types/http2";
import * as hattip from "../middleware";

/**
 * Create an HTTP/2 server
 */
export function createServer(
	handler: HattipHandler<NodePlatformInfo>,
	adapterOptions?: NodeAdapterOptions,
	serverOptions?: ServerOptions,
): Server {
	const listener = hattip.createMiddleware(handler, adapterOptions);
	return serverOptions
		? http2.createServer(serverOptions, listener)
		: http2.createServer(listener);
}

export const createMiddleware = hattip.createMiddleware<
	IncomingMessage,
	ServerResponse
>;

export type { NodeAdapterOptions } from "../types";
export type {
	DecoratedRequest,
	NodeMiddleware,
	NodePlatformInfo,
} from "../types/http2";
