import {
  compose,
  Context,
  Handler,
  HandlerStack,
  notFoundHandler,
  runHandler,
} from "@hattip/core";
import { Stats } from "fs";
import {
  createServer as createHttpServer,
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
  ServerOptions,
} from "http";
import { Readable } from "stream";
import sirv from "sirv";

/**
 * `IncomingMessage` possibly augmented by Express-specific
 * `ip` and `protocol` properties.
 */
export interface DecoratedRequest extends IncomingMessage {
  ip?: string;
  protocol?: string;
}

/** Connect/Express style request listener/middleware */
export type NodeMiddleware = (
  req: DecoratedRequest,
  res: ServerResponse,
  next?: () => void,
) => void;

/**
 * Options passed to `sirv` middleware.
 * @see https://github.com/lukeed/sirv/tree/master/packages/sirv
 */
export interface SirvOptions {
  dev?: boolean;
  etag?: boolean;
  maxAge?: number;
  immutable?: boolean;
  single?: string | boolean;
  ignores?: false | string | RegExp | (string | RegExp)[];
  extensions?: string[];
  dotfiles?: boolean;
  brotli?: boolean;
  gzip?: boolean;
  onNoMatch?: (req: IncomingMessage, res: ServerResponse) => void;
  setHeaders?: (res: ServerResponse, pathname: string, stats: Stats) => void;
}

/** Adapter options */
export interface NodeAdapterOptions {
  /**
   * Set the origin part of the URL to a constant value.
   * It defaults to `process.env.ORIGIN`. If neither is set,
   * the origin is computed from the protocol and hostname.
   * To determine the protocol, `req.protocol` is tried first.
   * If `trustProxy` is set, `X-Forwarded-Proto` header is used.
   * Otherwise, `req.socket.encrypted` is used.
   * To determine the hostname, `X-Forwarded-Host`
   * (if `trustProxy` is set) or `Host` header is used.
   */
  origin?: string;
  /**
   * Whether to trust `X-Forwarded-*` headers. `X-Forwarded-Proto`
   * and `X-Forwarded-Host` are used to determine the origin when
   * `origin` and `process.env.ORIGIN` are not set. `X-Forwarded-For`
   * is used to determine the IP address. The leftmost value is used
   * if multiple values are set. Defaults to true if `process.env.TRUST_PROXY`
   * is set to `1`, otherwise false.
   */
  trustProxy?: boolean;
  /**
   * The directory to serve static files from. For security, no static files
   * will be served if this is not set.
   */
  staticAssetsDir?: string;
  /**
   * Options passed to `sirv` middleware for serving static files.
   * @see https://github.com/lukeed/sirv/tree/master/packages/sirv
   */
  sirvOptions?: SirvOptions;
  /**
   * Whether to use native fetch when available instead of `node-fetch`.
   * Defaults to false.
   */
  preferNativeFetch?: boolean;
}

/**
 * Creates a request handler to be passed to http.createServer().
 * It can also be used as a middleware in Express or other
 * Connect-compatible frameworks).
 */
export function createListener(
  handlerStack: HandlerStack,
  options: NodeAdapterOptions = {},
): NodeMiddleware {
  const handler = compose(handlerStack);

  const {
    origin = process.env.ORIGIN,
    trustProxy = process.env.TRUST_PROXY === "1",
    staticAssetsDir,
    sirvOptions = {},
    preferNativeFetch = false,
  } = options;

  const nodeFetchInstallPromise = installNodeFetch(preferNativeFetch);

  let { protocol, hostname } = origin
    ? new URL(origin)
    : ({} as Record<string, undefined>);

  const sirvMiddleware = staticAssetsDir
    ? sirv(staticAssetsDir, sirvOptions)
    : null;

  const nodeAdapterHandler: NodeMiddleware = async (req, res, next) => {
    await nodeFetchInstallPromise;

    function getForwardedHeader(name: string) {
      return (String(req.headers["x-forwarded-" + name]) || "")
        .split(",", 1)[0]
        .trim();
    }

    protocol =
      protocol ||
      req.protocol ||
      (trustProxy && getForwardedHeader("proto")) ||
      ((req.socket as any).encrypted && "https") ||
      "http";

    hostname =
      hostname ||
      (trustProxy && getForwardedHeader("host")) ||
      req.headers.host;

    const ip =
      req.ip ||
      (trustProxy && getForwardedHeader("for")) ||
      req.socket.remoteAddress ||
      "";

    const request = new Request(protocol + "://" + hostname + req.url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : (req as any),
    });

    const toBeWaited: Promise<any>[] = [];

    const context: Context = {
      ip,

      waitUntil(promise) {
        toBeWaited.push(promise);
      },

      next: () => notFoundHandler(request, context),
    };

    const response = (await runHandler(handler, request, context))!;

    if (!next || !context.isNotFound) {
      res.statusCode = response.status;

      if ("raw" in response.headers) {
        const rawHeaders: Record<string, string | string[]> = (
          response.headers as any
        ).raw();

        for (const [key, value] of Object.entries(rawHeaders)) {
          res.setHeader(key, value);
        }
      } else {
        for (const [key, value] of response.headers) {
          res.setHeader(key, value);
        }
      }

      const contentLengthSet = response.headers.get("content-length");

      if (response.body) {
        // We will buffer a single chunk of data, so that we can set
        // the Content-Length header if the whole response is made of
        // a single chunk.
        let lastChunk: Buffer | undefined;
        let chunkCount = 0;

        for await (let chunk of response.body as any) {
          chunk = Buffer.from(chunk);
          if (lastChunk) {
            res.write(lastChunk);
          }
          lastChunk = chunk;
          chunkCount++;
        }

        if (chunkCount === 1 && !contentLengthSet) {
          res.setHeader("content-length", lastChunk!.length);
        }

        if (lastChunk) {
          res.write(lastChunk);
        } else if (!contentLengthSet) {
          res.setHeader("content-length", "0");
        }
      } else if (!contentLengthSet) {
        res.setHeader("content-length", "0");
      }

      res.end();
    }

    await Promise.all(toBeWaited);

    next?.();
  };

  if (sirvMiddleware) {
    return (req, res, next) =>
      sirvMiddleware(req, res, () => {
        nodeAdapterHandler(req, res, next);
      });
  } else {
    return nodeAdapterHandler;
  }
}

/**
 * Installs node-fetch into the global scope.
 * @param preferNative Don't install and use native `fetch` if available.
 */
export async function installNodeFetch(preferNative = true) {
  if (!preferNative || typeof fetch === "undefined") {
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
}

/**
 * Create an HTTP server
 */
export function createServer(
  handler: Handler,
  adapterOptions?: NodeAdapterOptions,
  serverOptions?: ServerOptions,
): HttpServer {
  const listener = createListener(handler, adapterOptions);
  return serverOptions
    ? createHttpServer(serverOptions, listener)
    : createHttpServer(listener);
}
