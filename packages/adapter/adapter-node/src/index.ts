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

/**
 * Creates a request handler to be passed to http.createServer().
 * It can also be used as a middleware in Express or other
 * Connect-compatible frameworks).
 */
export function createMiddleware(
  handler: HattipHandler,
  options: NodeAdapterOptions = {},
): NodeMiddleware {
  const nodeAdapterHandler = createNodeMiddleware(handler, options);

  return async (req, res, next) => {
    nodeAdapterHandler(req, res, next);
  };
}

/**
 * Create an HTTP server
 */
export function createServer(
  handler: HattipHandler,
  adapterOptions?: NodeAdapterOptions,
  serverOptions?: ServerOptions,
): HttpServer {
  const listener = createMiddleware(handler, adapterOptions);
  return serverOptions
    ? createHttpServer(serverOptions, listener)
    : createHttpServer(listener);
}
