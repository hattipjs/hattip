import type {
	IncomingMessage,
	ServerResponse,
	Server,
	ServerOptions,
} from "node:http";

export type { IncomingMessage, ServerResponse, Server, ServerOptions };

export type DecoratedRequest =
	import("./common").DecoratedRequest<IncomingMessage>;

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = import("./common").NodeMiddleware<
	IncomingMessage,
	ServerResponse
>;

export type NodePlatformInfo = import("./common").NodePlatformInfo<
	IncomingMessage,
	ServerResponse
>;
