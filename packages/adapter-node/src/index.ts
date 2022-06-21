import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import {
  createServer as createHttpServer,
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
  ServerOptions,
} from "http";
import { Readable } from "stream";
import sirv, { Options as SirvOptions } from "sirv";

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
export type { SirvOptions };

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
   * Whether to use native fetch instead of `node-fetch`.Defaults to false.
   */
  useNativeFetch?: boolean | "auto";
}

export interface NodePlatformInfo {
  request: DecoratedRequest;
  response: ServerResponse;
}

/**
 * Creates a request handler to be passed to http.createServer().
 * It can also be used as a middleware in Express or other
 * Connect-compatible frameworks).
 */
export function createListener(
  handler: HattipHandler,
  options: NodeAdapterOptions = {},
): NodeMiddleware {
  const {
    origin = process.env.ORIGIN,
    trustProxy = process.env.TRUST_PROXY === "1",
    staticAssetsDir,
    sirvOptions = {},
    useNativeFetch = false,
  } = options;

  const nodeFetchInstallPromise = installFetch(useNativeFetch);

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

    let passThroughCalled = false;

    const context: AdapterRequestContext<NodePlatformInfo> = {
      request,

      ip,

      waitUntil(promise) {
        // Do nothing
        void promise;
      },

      passThrough() {
        passThroughCalled = true;
      },

      platform: {
        request: req,
        response: res,
      },
    };

    const response = await handler(context);

    if (!next || !passThroughCalled) {
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
        if (contentLengthSet) {
          for await (let chunk of response.body as any) {
            chunk = Buffer.from(chunk);
            res.write(chunk);
          }
        } else {
          const reader = (
            response.body as any as AsyncIterable<Buffer | string>
          )[Symbol.asyncIterator]();

          const first = await reader.next();
          if (first.done) {
            res.setHeader("content-length", "0");
          } else {
            const secondPromise = reader.next();
            let second = await Promise.race([
              secondPromise,
              Promise.resolve(null),
            ]);

            if (second && second.done) {
              res.setHeader("content-length", first.value.length);
              res.write(first.value);
            } else {
              res.write(first.value);
              second = await secondPromise;
              for (; !second.done; second = await reader.next()) {
                res.write(Buffer.from(second.value));
              }
            }
          }
        }
      } else if (!contentLengthSet) {
        res.setHeader("content-length", "0");
      }

      res.end();
    }

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
 * Installs `fetch` into the global scope.
 * @param useNative Whether to use native `fetch`.
 */
export async function installFetch(useNative: boolean | "auto" = false) {
  if (!useNative || (useNative === "auto" && typeof fetch === "undefined")) {
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
  } else if (typeof TransformStream === "undefined") {
    if (typeof fetch === "undefined") {
      throw new Error(
        "Native fetch is not available. Try running with --experimental-fetch or use node-fetch.",
      );
    }

    await import("node:stream/web").then((stream) => {
      global.TransformStream = stream.TransformStream as any;
    });
  }
}

/**
 * Create an HTTP server
 */
export function createServer(
  handler: HattipHandler,
  adapterOptions?: NodeAdapterOptions,
  serverOptions?: ServerOptions,
): HttpServer {
  const listener = createListener(handler, adapterOptions);
  return serverOptions
    ? createHttpServer(serverOptions, listener)
    : createHttpServer(listener);
}
