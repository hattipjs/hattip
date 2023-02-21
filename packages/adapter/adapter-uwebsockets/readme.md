# `@hattip/adapter-uwebsockets`

HatTip adapter for [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) on Node.js.

## Usage

```js
import { createServer } from "@hattip/adapter-uwebsockets";
import handler from "./handler.js";

createServer(handler).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

## API

```ts
/**
 * Create an HTTP server
 */
function createServer(
  handler: Handler,
  adapterOptions?: UWebSocketsAdapterOptions,
  appOptions?: appOptions,
): TemlateApp;

/** Adapter options */
export interface UWebSocketAdapterOptions {
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
  /** Use SSL (https) */
  ssl?: boolean;
  /** Static file directory */
  staticDir?: string;
  /**
   * Callback to configure the uWebSockets.js app.
   * Useful for adding WebSocket or HTTP routes before the HatTip handler
   * is added.
   */
  configureServer?: (app: TemplatedApp) => void;
}
```

## Limitations

This adapter is experimental. In particular, the static file server is very limited at the moment.

## Using native `fetch`

This adapter uses [`node-fetch`](https://github.com/node-fetch/node-fetch) if the `fetch` global is not available. You can disable this behavior by importing your adapter from `@hattip/adapter-uwebsockets/native-fetch`, which will throw an error if `fetch` is not available.

## `context.platform`

This adapter makes uWebSockets.js `request` (`HTTPRequest`) and `response` (`HTTPResponse`) objects available in `context.platform`.
