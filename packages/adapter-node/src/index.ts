import type { HattipHandler } from "@hattip/core";
import {
  createServer as createHttpServer,
  Server as HttpServer,
  ServerResponse,
  ServerOptions,
} from "http";
import { Readable } from "stream";
import {
  createMiddleware as createNodeMiddleware,
  DecoratedRequest,
  NodeAdapterOptions,
} from "./native-fetch";

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
  const nodeFetchInstallPromise = installNodeFetch();

  const nodeAdapterHandler = createNodeMiddleware(handler, options);

  return async (req, res, next) => {
    await nodeFetchInstallPromise;
    nodeAdapterHandler(req, res, next);
  };
}

/**
 * Installs `node-fetch` into the global scope.
 */
export async function installNodeFetch() {
  await import("node-fetch").then((nodeFetch) => {
    (globalThis as any).fetch = nodeFetch.default;
    (globalThis as any).Request = nodeFetch.Request;
    (globalThis as any).Headers = nodeFetch.Headers;

    // node-fetch doesn't allow constructing a Request from ReadableStream
    // see: https://github.com/node-fetch/node-fetch/issues/1096
    class Response extends nodeFetch.Response {
      constructor(
        input: import("node-fetch").BodyInit,
        init?: import("node-fetch").ResponseInit,
      ) {
        if (input instanceof ReadableStream) {
          input = Readable.from(input as any);
        }

        super(input as any, init);
      }
    }

    (globalThis as any).Response = Response;
  });
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
