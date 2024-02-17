# `@hattip/compose`

Middleware system for Hattip.

## `compose`

The `compose` function composes multiple handlers into a single one, creating a simple but powerful middleware system. Each handler is called in sequence until one returns a response. A handler can pass control to the next handler either by not returning anything or calling `context.next()`. The latter allows the handler to modify the response before returning. Handler arrays passed to `compose` is flattened and falsy values are filtered.

```js
import { compose } from "@hattip/compose";

// Example of making things available in `ctx`
// Middleware to parse the URL into a URL object
const urlParser = (ctx) => {
  ctx.url = new URL(ctx.request.url);
};

// Example of modifying the response
// Middleware to add an X-Powered-By header
const poweredBy = async (ctx) => {
  const response = await ctx.next();
  response.headers.set("X-Powered-By", "Hattip");
  return response;
};

const homeHandler = (ctx) => {
  if (ctx.url.pathname === "/") {
    return new Response("Home");
  }
};

const fooHandler = (ctx) => {
  if (ctx.url.pathname === "/foo") {
    return new Response("Foo");
  }
};

const barHandler = (ctx) => {
  if (ctx.url.pathname === "/bar") {
    return new Response("Bar");
  }
};

export default compose(
  urlParser,
  poweredBy,
  homeHandler,
  fooHandler,
  barHandler,
);
```

`compose` ends the handler chain with a final handler that calls `context.passThrough` and returns a 404 response.

## Handler

Handlers passed to `compose` can return or throw a `Request` object or any other object with a `toResponse` method (which in turn returns a `Response`) synchronously or asynchronously. Returning a falsy value implicitly passes the control to the next handler. Calling `context.next()` does the same but explicitly and allows the handler to modify the response before returning.

## `RequestContext`

Handlers are passed a single argument, an object representing the request context:

```ts
interface RequestContext {
  /**
   * The request. @see https://developer.mozilla.org/en-US/docs/Web/API/Request
   */
  request: Request;
  /**
   * IP address that generated the request. Check with the platform adapter
   * documentation to understand how it is generated.
   */
  ip: string;
  /**
   * Platform specific stuff. Check with the platform adapter documentation for
   * more information.
   */
  platform: unknown;
  /**
   * Signal that the request hasn't been handled and the returned response is
   * a placeholder (usually a 404). In this case the adapter should handle the
   * request itself if it has a way to do that. For example, an Express
   * middleware adapter may call next() to let the next middleware handle the
   * request. An edge adapter may pass through the request to the origin
   * server. Other adapters may return the placeholder and ignore this call.
   */
  passThrough(): void;
  /**
   * Some platforms (e.g. Cloudflare Workers) require this to be called to
   * keep running after the response is returned when streaming responses.
   * This is a no-op if the platform adapter doesn't need to do anything.
   */
  waitUntil(promise: Promise<any>): void;
  /** Parsed request URL */
  url: URL;
  /** Request method */
  method: string;
  /** App-local stuff */
  locals: Locals;
  /** Call the next handler in the chain */
  next(): Promise<Response>;
  /** Redefine to handle errors by generating a response from an error */
  handleError(error: unknown): Response | Promise<Response>;
}
```
