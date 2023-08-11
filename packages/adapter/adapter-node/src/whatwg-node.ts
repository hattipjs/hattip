// TODO: Remove or update this rule!
import { ServerResponse } from "node:http";
import { DecoratedRequest, NodeAdapterOptions } from "./common";
import installWhatwgNodeFetch from "@hattip/polyfills/whatwg-node";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";

installWhatwgNodeFetch();
installGetSetCookie();
installCrypto();

export type { DecoratedRequest, NodeAdapterOptions };

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = (
	req: DecoratedRequest,
	res: ServerResponse,
	next?: () => void,
) => void;

export interface NodePlatformInfo {
	request: DecoratedRequest;
	response: ServerResponse;
}

export { createMiddleware, createServer } from "./common";
