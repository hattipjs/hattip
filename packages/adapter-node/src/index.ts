import type { IncomingMessage, ServerResponse } from "http";
import { Handler } from "@hattip/core";
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

export type Middleware = (
  req: DecoratedRequest,
  res: ServerResponse,
  next: () => void,
) => void;

export default function nodeAdapter(handler: Handler): Middleware {
  return async function nodeAdapterHandler(req, res, next) {
    await nodeFetchInstallPromise;

    const protocol =
      req.protocol || ((req.socket as any).encrypted ? "https" : "http");
    const hostname = req.hostname || req.headers.host;

    const request = new Request(protocol + "://" + hostname + req.url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : (req as any),
    });

    const waited: Promise<any>[] = [];

    const response = await handler(request, {
      ip: req.ip || req.socket.remoteAddress || "",

      waitUntil(promise) {
        waited.push(promise);
      },
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

    await Promise.all(waited);

    next();
  };
}
