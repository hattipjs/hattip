import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import {
  createServer as createHttpServer,
  Server as HttpServer,
  IncomingMessage,
  ServerResponse,
  ServerOptions,
} from "http";

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
   * is used to determine the IP address. The leftmost values are used
   * if multiple values are set. Defaults to true if `process.env.TRUST_PROXY`
   * is set to `1`, otherwise false.
   */
  trustProxy?: boolean;
}

export interface NodePlatformInfo {
  request: DecoratedRequest;
  response: ServerResponse;
}

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createMiddleware(
  handler: HattipHandler,
  options: NodeAdapterOptions = {},
): NodeMiddleware {
  const {
    origin = process.env.ORIGIN,
    trustProxy = process.env.TRUST_PROXY === "1",
  } = options;

  let { protocol, hostname } = origin
    ? new URL(origin)
    : ({} as Record<string, undefined>);

  return async (req, res, next) => {
    // TODO: Support the newer `Forwarded` standard header
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

    let headers = req.headers as any;
    if (headers[":method"]) {
      headers = Object.fromEntries(
        Object.entries(headers).filter(([key]) => !key.startsWith(":")),
      );
    }

    const request = new Request(protocol + "://" + hostname + req.url, {
      method: req.method,
      headers,
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
      for (const [key, value] of response.headers) {
        if (key === "set-cookie") {
          const setCookie = response.headers.getSetCookie();
          res.setHeader("set-cookie", setCookie);
        } else {
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
