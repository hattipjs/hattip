# `@hattip/adapter-node`

HatTip adapter for Node.js.

## Standalone usage

```js
import { createServer } from "@hattip/adapter-node";
import handler from "./handler.js";

createServer(handler).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

## Using with Node middleware

```js
import { createServer } from "node:http";
import sirv from "sirv";
import { createMiddleware } from "@hattip/adapter-node";
import hattipHandler from "./entry-hattip.js";

const sirvMiddleware = sirv("public");
const hattipMiddleware = createMiddleware(hattipHandler);

createServer(
  // Chain middlewares manually
  (req, res) => sirvMiddleware(req, res, () => hattipMiddleware(req, res)),
).listen(3000, () => {
  console.log(`Server listening on http://localhost:3000`);
});
```

## Using with Express

```js
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import express from "express";

const app = express();

const middleware = createMiddleware(handler);
app.use(middleware);

app.listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

## API

```ts
/**
 * Creates a request handler to be passed to http.createServer().
 * It can also be used as a middleware in Express or other
 * Connect-compatible frameworks).
 */
function createMiddleware(
  handler: Handler,
  options?: NodeAdapterOptions,
): NodeMiddleware;

/**
 * Create an HTTP server
 */
function createServer(
  handler: Handler,
  adapterOptions?: NodeAdapterOptions,
  serverOptions?: ServerOptions,
): Server;

/** Adapter options */
interface NodeAdapterOptions {
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
}
```

## Using native `fetch`

This adapter uses [`node-fetch`](https://github.com/node-fetch/node-fetch) if the `fetch` global is not available. You can disable this behavior by importing your adapter from `@hattip/adapter-node/native-fetch`, which will throw an error if `fetch` is not available.

## `context.passThrough` behavior

Calling `context.passThrough` will pass the request to the next handler when used as a middleware. Otherwise the placeholder response will be returned.

## `context.platform`

This adapter makes Node's native `request` (`IncomingMessage`) and `response` (`ServerResponse`) objects available in `context.platform`.
