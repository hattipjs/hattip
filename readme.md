# ![HatTip](graphics/logo.svg)

> <small>(nothing)</small> Like Express but Runs Anywhere

Follow: [Twitter > @cyco130](https://twitter.com/cyco130)  
Chat: <a href="https://discord.com/invite/vTvXzBMySh">Discord > Vike<img src="./graphics/hash.svg" height="17" width="23" valign="text-bottom" alt="hash"/>HatTip</a>

HatTip is a modern, modular, and minimalist JavaScript framework for handling HTTP requests. It aims to build a universal middleware ecosystem that can be used across the entire JavaScript universe.

- ✨ Modern: Based on current and future web standards
- 🧩 Modular: Use as much or as little as you need
- 🪛 Minimalist: Everything you need, nothing you don't

```js
// handler.js

// This server handler works anywhere: it can be used for Node.js and Cloudflare Workers.

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

- ✅ Node.js (including Express)
- ✅ Cloudflare Workers
- 🚧 Deno
- 🚧 Netlify
- 🚧 Vercel

Adapters let you run HatTip on any platform. Here's how you can use HatTip with Node.js:

```js
// entry-node.js
import { createServer } from "@hattip/adapter-node";
import handler from "./handler.js";

createServer(handler).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
```

..and on Cloudflare Workers:

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
import { createListener } from "@hattip/adapter-node";
import handler from "./handler.js";
import express from "express";
import coolExpressMiddleware from "cool-express-middleware";

const middleware = createListener(handler, {
  staticAssetsDir: "public",
});

const app = express();

// TODO: Replace with coolHatTipMiddleware once available
app.use(coolExpressMiddleware(middleware));
app.use(middleware);

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

That's it. This is the entirety of the HatTip API. Everything else is middleware functions similar the above that add various features.

## Packages

HatTip is extremely modular so you can use as little or as much as you need:

- [`core`](./packages/core): A type-only package that defines the interface between your application and platform adapters.
- Adapters: Enable HatTip to run on any platform:
  - [`adapter-node`](./packages/adapter-node): Node.js (either as a standalone server or as a middleware function that can be used with Express and similar frameworks)
  - [`adapter-cloudflare-workers`](./packages/adapter-cloudflare-workers): Cloudflare Workers
- Bundlers: Worker and serverless platforms usually require your code to be in bundled form. These packages provide fine-tuned bundlers for their respective platforms:
  - [`bundler-cloudflare-workers`](./packages/bundler-cloudflare-workers): [`esbuild`](https://esbuild.github.io)-based bundler for Cloudflare Workers
- [`compose`](./packages/compose): A middleware system for combining multiple handlers into a single handler.

A zero-config development environment based on [Vite](https://vitejs.dev) is also in the works.
