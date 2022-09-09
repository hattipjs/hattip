// TODO: Remove or update this rule!
import { ServerResponse } from "http";
import { DecoratedRequest, NodeAdapterOptions } from "./common";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";

installNodeFetch();
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
