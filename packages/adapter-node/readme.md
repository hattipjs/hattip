# `@hattip/adapter-node`

HatTip adapter for Node.js.

## Standalone usage

```js
import { createServer } from "@hattip/adapter-node";
import handler from "./handler.js";

createServer(handler, { staticAssetsDir: "public" }).listen(
  3000,
  "localhost",
  () => {
    console.log("Server listening on http://localhost:3000");
  },
);
```

## Using with Express

```js
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import express from "express";

const app = express();

// You can also use express.static instead of `staticAssetsDir` if you wish
const middleware = createMiddleware(handler, { staticAssetsDir: "public" });
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

This adapter uses [`node-fetch`](https://github.com/node-fetch/node-fetch) as its `fetch` implementation. Node versions since 16.15 and 17.5 have a native implementation behind the `--experimental-fetch` flag. You can opt in for the native implementation by importing your adapter from `@hattip/adapter-node/native-fetch`. Please note that Node's native `fetch` doesn't support setting more than one `Set-Cookie` headers at the moment.

## `context.passThrough` behavior

Calling `context.passThrough` will pass the request to the next handler when used as a middleware. Otherwise the placeholder response will be returned.

## `context.platform`

This adapter makes Node's native `request` (`IncomingMessage`) and `response` (`ServerResponse`) objects available in `context.platform`.
