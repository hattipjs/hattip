import type { Socket } from "node:net";
import type { Buffer } from "node:buffer";

interface PossiblyEncryptedSocket extends Socket {
	encrypted?: boolean;
}

/**
 * `IncomingMessage` possibly augmented by Express-specific
 * `ip` and `protocol` properties.
 */
export type DecoratedRequest<NodeRequest> = Omit<NodeRequest, "socket"> & {
	ip?: string;
	protocol?: string;
	socket?: PossiblyEncryptedSocket;
	rawBody?: Buffer | null;
};

/** Connect/Express style request listener/middleware */
export type NodeMiddleware<NodeRequest, NodeResponse> = (
	req: DecoratedRequest<NodeRequest>,
	res: NodeResponse,
	next?: (err?: unknown) => void,
) => void;

export interface NodePlatformInfo<NodeRequest, NodeResponse> {
	name: "node";
	request: DecoratedRequest<NodeRequest>;
	response: NodeResponse;
}
