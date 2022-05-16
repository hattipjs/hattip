# ![HatTip](graphics/logo.svg)

> Express.js from the Future. Write Once, Deploy Anywhere.

Follow: [Twitter > @cyco130](https://twitter.com/cyco130)
<br/>
Chat: <a href="https://discord.com/invite/H23tjRxFvx">Discord > Vike<img src="/graphics/hash.svg" height="17" width="23" valign="text-bottom" alt="hash"/>HatTip</a>

```js
// handler.js

// This server handler works everywhere: we use it for both Node.js and Cloudflare Workers.

export default (req, ctx) => {
  const { pathname } = ctx.url;
  if (pathname === "/") {
    return new Response("Hello from HatTip.");
  }
  if (pathname === "/about") {
    return new Response(
      "This HTTP handler works in Node.js and Cloudflare Workers.",
    );
  }
  return null;
};
```

`Response` and `req: Request` follow the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) standard. So if you're familiar with Cloudflare Workers or Deno, then you'll feel right a home. If not: learn today the standard that will tomorrow be ubiqutious.

We also closely follow the [WinterCG](https://wintercg.org/) which lays the foundation beyond the Fetch API.

```js
// server.js

import handler from "./handler";
import nodeAdapter from "@hattip/adapter-node";

// A Node.js server
const server = nodeAdapter(handler);
server.start();

// That's all it takes to turn our hanlder into a Node.js server.
```

```js
// worker.js

import handler from "./handler";
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";

// A Cloudflare Worker
export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

We can even embed our handler into an Express.js server:

```js
// server-express.js

import handler from "./handler";
import express from "express";
import expressAdapter from "@hattip/adapter-express";

const app = express();
app.use(expressAdapter(handler));
app.listen(3000);
```

That way, we can still use Express.js in case we need a tool that works only with Express.js. (Although this will luckley be soon a thing of the past.)

HatTip is tiny and zero-dependency.

**Adapters**

- ✅ Node.js
- ✅ Cloudflare Workers
- ✅ Express.js
- 🚧 Deno Deploy
- 🚧 Netlify Edge
- 🚧 Vercel Edge

**Features**

- [Request => Response](#request--response)
- [`compose()`](#compose)
- [`createRouter()`](#createRouter)

## Request => Response

HatTip handlers are JavaScript functions that take a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object and return a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object (or a `Promise` of one). Here are a few simple handler examples:

```js
const helloHandler = () => new Response("Hello world!");
const echoHandler = (request) => new Response(request.url);
const jsonHandler = () => new Response(JSON.stringify({ ping: "pong" }));
```

Handlers can accept a second `context` (`ctx` for short) argument meant to be used for storing various things without monkey-patching the `Request` object. For example a router can parse path parameters (e.g. `/user/:id`) and make them available in the `ctx.params` object.

If the handlers doesn't return a response, a generic `404` is returned.

For additional flexibility, instead of a `Response` object, a handler can return or throw anything with a `toResponse` method that returns a `Response` object.

That's it. This is the entirety of the HatTip API. Everything else is middleware functions that add various features.

<br/>

## `compose()`

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

<br/>

## `createRouter()`

TODO
