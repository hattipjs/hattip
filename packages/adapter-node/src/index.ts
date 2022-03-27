import type { IncomingMessage, ServerResponse } from "http";
import { Handler, notFoundHandler } from "@hattip/core";
import { Readable } from "stream";

// node-fetch is an ESM only package. This slightly awkward dynamic import
// is required to use it in CJS.
const nodeFetchInstallPromise = import("node-fetch").then((nodeFetch) => {
  (globalThis as any).fetch = nodeFetch.default;
  (globalThis as any).Request = nodeFetch.Request;
  (globalThis as any).Headers = nodeFetch.Headers;

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

interface DecoratedRequest extends IncomingMessage {
  ip?: string;
  protocol?: string;
  hostname?: string;
}

export type NodeHandler = (
  req: DecoratedRequest,
  res: ServerResponse,
  next: () => void,
) => void;

export interface NodeAdapterOptions {
  origin?: string;
  trustProxy?: boolean;
}

export default function nodeAdapter(
  handler: Handler,
  options: NodeAdapterOptions = {},
): NodeHandler {
  const {
    origin = process.env.ORIGIN,
    trustProxy = process.env.TRUST_PROXY === "1",
  } = options;

  let { protocol, hostname } = origin
    ? new URL(origin)
    : ({} as Record<string, undefined>);

  return async function nodeAdapterHandler(req, res, next) {
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
      req.hostname ||
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

    const response = await handler(request, {
      ip,

      waitUntil(promise) {
        toBeWaited.push(promise);
      },

      next: notFoundHandler,
    });

    if (response) {
      res.statusCode = response.status;

      const rawHeaders: Record<string, string | string[]> = (
        response.headers as any
      ).raw();

      for (const [key, value] of Object.entries(rawHeaders)) {
        res.setHeader(key, value);
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

    next();
  };
}
