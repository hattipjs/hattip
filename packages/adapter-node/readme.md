# `@hattip/adapter-node`

HatTip adapter for Node.js.

## Standalone usage

```js
import { createServer } from "@hattip/adapter-node";
import handler from "./handler.js";

createServer(handler, {}).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

## Using with Express

```js
import { createListener } from "@hattip/adapter-node";
import handler from "./index.js";
import express from "express";

const app = express();

const middleware = createListener(handler);
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
function createListener(handler: Handler, options?: NodeAdapterOptions): NodeMiddleware;

/**
 * Create an HTTP server
 */
function createServer(handler: Handler, adapterOptions?: NodeAdapterOptions, serverOptions?: ServerOptions): Server;

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
```
