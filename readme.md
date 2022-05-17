# ![HatTip](graphics/logo.svg)

<p align="center" style="font-size: 1.5em">
Like Express, but for the future
</p>

HatTip is a tiny JavaScript framework for handling HTTP requests. It's based on web standards and aims to build a portable middleware ecosystem that works on any JavaScript platform. Currently supported targets are Node.js and Cloudflare Workers. Adapters for Netlify, Vercel, and Deno are in the works.

## Request => Response

HatTip handlers are JavaScript functions that take a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object and return a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object (or a `Promise` of one). Here are a few simple handler examples:

```js
const helloHandler = () => new Response("Hello world!");
const echoHandler = (request) => new Response(request.url);
const jsonHandler = () => new Response(JSON.stringify({ ping: "pong" }));
```

Handlers can accept a second `context` (`ctx` for short) argument meant to be used for storing various things without monkey-patching the `Request` object. For example a router can parse path parameters (e.g. `/user/:id`) and make them available in the `ctx.params` object.

The `compose` function can be used to compose multiple handlers into a single handler. Each handler is called in sequence until one returns a response. A handler can pass control to the next handler by returning `null` or calling `ctx.next()`. The latter allows the handler to modify the response before returning:

```js
import { compose } from "@hattip/core";

// Example of making things available in `ctx`
// Middleware to parse the URL into a URL object
const urlParser = (req, ctx) => {
  ctx.url = new URL();
  return null;
};

// Example of modifying the response
// Middleware to add an X-Powered-By header
const poweredBy = async (req, ctx) => {
  const response = await ctx.next();
  response.headers.set("X-Powered-By", "HatTip");
  return response;
};

const homeHandler = (req, ctx) => {
  if (ctx.url.pathname === "/") {
    return new Response("Home");
  } else {
    return null;
  }
};

const fooHandler = (req, ctx) => {
  if (ctx.url.pathname === "/foo") {
    return new Response("Foo");
  } else {
    return null;
  }
};

const barHandler = (req, ctx) => {
  if (ctx.url.pathname === "/bar") {
    return new Response("Bar");
  } else {
    return null;
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

If none of the handlers return a response, a generic 404 is returned.

For additional flexibility, instead of a `Response` object, a handler can return or throw anything with a `toResponse` method that returns a `Response` object.

That's it. This is the entirety of the HatTip API. Everything else is middleware functions similar the above that add various features.
