# ![HatTip](graphics/logo.svg)

> <small>(nothing)</small> Like Express.js.

Follow: [Twitter > @cyco130](https://twitter.com/cyco130) & [Twitter > @brillout](https://twitter.com/brillout)  
Chat: <a href="https://discord.com/invite/vTvXzBMySh">Discord > Cubes<img src="./graphics/hash.svg" height="17" width="23" valign="text-bottom" alt="hash"/>HatTip</a>

HatTip is a set of JavaScript packages for building HTTP server applications.

- &#x2728; Modern: Based on current and future web standards (Fetch API & WinterCG).
- &#x1F30D; Universal: Runs anywhere (Node.js, the Edge, Deno, ...).
- &#x1F9E9; Modular: Use as much or as little as you need.
- &#x1FA9B; Minimalist: Everything you need, nothing you don't.

It aims to build an ecosystem of universal middlewares that can be used across the entire JavaScript universe.

```js
// handler.js

// This request handler works anywhere, e.g. Node.js or Cloudflare Workers.

export default (context) => {
  const { pathname } = new URL(context.request.url);
  if (pathname === "/") {
    return new Response("Hello from HatTip.");
  } else if (pathname === "/about") {
    return new Response(
      "This HTTP handler works in Node.js and Cloudflare Workers.",
    );
  } else {
    return new Response("Not found.", { status: 404 });
  }
};
```

A HatTip handler is passed a `context` object which represents the request context and contains `context.request` which is a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object. It returns a standard [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object (or a promise of one). `Response` and `Request` follow the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) standard. So if you're familiar with service workers, Cloudflare Workers, or Deno, you'll feel right a home. If not, learn today the standard that will tomorrow be ubiquitous.

We believe in a diverse but interoperable future for the JavaScript ecosystem and we're closely following the [WinterCG](https://wintercg.org/) which lays the foundation beyond the Fetch API.

## Adapters

- ✅ Node.js
- ✅ Cloudflare Workers
- ✅ Express.js (use HatTip handlers/middlewares in your Express.js app)
- ✅ Vercel Serverless Functions
- ✅ Vercel Edge Functions
- ✅ Netlify Functions
- ✅ Netlify Edge Functions
- ✅ Deno (including Deno Deploy)
- ✅ Bun
- 🚧 Service Workers

Adapters let you run HatTip on any platform. Here's how you can use HatTip with Node.js:

```js
// entry-node.js
import { createServer } from "@hattip/adapter-node";
import handler from "./handler.js";

createServer(handler).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

...and on Cloudflare Workers:

```js
// entry-cfw.js
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./handler.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

You can even use your HatTip application as an Express middleware when you have to use that one Express library that doesn't have a replacement anywhere else:

```js
// entry-express.js
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./handler.js";
import express from "express";
import oldAndRustyExpressMiddleware from "old-and-rusty-express-middleware";

const hattip = createMiddleware(handler);
const app = express();

// TODO: Replace with shinyNewHatTipMiddleware once ready
app.use(oldAndRustyExpressMiddleware());
app.use(hattip);

app.listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

## Middleware system

The `compose` function from the [`@hattip/compose`](./packages/compose) package can be used to compose multiple handlers into a single one, creating a simple but powerful middleware system. Each handler is called in sequence until one returns a response. A handler can pass control to the next handler either by not returning anything or calling `ctx.next()`. The latter allows the handler to modify the response before returning:

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
  response.headers.set("X-Powered-By", "HatTip");
  return response;
};

// HatTip does have a router, this is to illustrate the basics
const homeHandler = (ctx) => {
  if (ctx.url.pathname === "/") {
    return new Response("Home");
  }
};

const fooHandler = (req, ctx) => {
  if (ctx.url.pathname === "/foo") {
    return new Response("Foo");
  }
};

const barHandler = (req, ctx) => {
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

A handler can return or throw a `Response` or anything with a `toResponse` method when used with the `compose` function. Handlers can also set `context.handleError` to handle uncaught errors.

**That's it**. This is the entirety of the HatTip API. Everything else is middleware functions similar the above that add various features and development tools to make your life easier.

## Packages

HatTip is extremely modular so you can use as little or as much as you need:

- [`core`](./packages/base/core): A type-only package that defines the interface between your application and platform adapters
- **Adapters:** Enable HatTip to run on any platform:
  - [`adapter-node`](./packages/adapter/adapter-node): Node.js, either as a standalone server or as a middleware function that can be used with Express and similar frameworks. Also works for Vercel Serverless Functions.
  - [`adapter-cloudflare-workers`](./packages/adapter/adapter-cloudflare-workers): Cloudflare Workers
  - [`adapter-vercel-edge`](./packages/adapter/adapter-vercel-edge): Vercel Edge Functions
  - [`adapter-netlify-functions`](./packages/adapter/adapter-netlify-functions): Netlify Functions
  - [`adapter-netlify-edge`](./packages/adapter/adapter-netlify-edge): Netlify Edge Functions
  - [`adapter-deno`](./packages/adapter/adapter-deno): Deno
  - [`adapter-bun`](./packages/adapter/adapter-bun): Bun
- **Bundlers:** Worker and serverless platforms usually require your code to be in bundled form. These packages provide bundlers fine-tuned for their respective platforms:
  - [`bundler-cloudflare-workers`](./packages/bundler/bundler-cloudflare-workers): Cloudflare Workers
  - [`bundler-vercel`](./packages/bundler/bundler-vercel): Vercel edge and serverless functions
  - [`bundler-netlify`](./packages/bundler/bundler-netlify): Netlify edge and Netlify functions
  - [`bundler-deno`](./packages/bundler/bundler-deno): Deno
- [`polyfills`](./packages/base/polyfills): A collection of polyfills used by adapters for compatibility across platforms
- [`compose`](./packages/base/compose): A middleware system for combining multiple handlers into a single one
- [`router`](./packages/base/router): Express-style imperative router

A zero-config development environment based on [Vite](https://vitejs.dev) is also in the works
