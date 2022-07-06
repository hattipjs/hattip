// TODO: Remove or update this rule!
/* eslint-disable import/no-unresolved */
import type { HattipHandler } from "@hattip/core";
import {
  createServer as createHttpServer,
  Server as HttpServer,
  ServerResponse,
  ServerOptions,
} from "http";
import {
  createMiddleware as createNodeMiddleware,
  DecoratedRequest,
  NodeAdapterOptions,
} from "./common";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";

installNodeFetch();
installGetSetCookie();

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
