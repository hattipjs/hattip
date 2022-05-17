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

HatTip is tiny and HatTip core is zero-dependency.

**Adapters**

- ✅ Node.js
- ✅ Cloudflare Workers
- ✅ Express.js
- 🚧 Deno Deploy
- 🚧 Netlify Edge
- 🚧 Vercel Edge

**Features**

- [HatTip Core: Request => Response](./packages/core#readme)
- [`compose()`](./packages/core/src/compose#readme)
- [`createRouter()`](./packages/router#readme)
