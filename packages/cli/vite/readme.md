# `@hattip/vite`

Vite plugin and command-line wrapper for developing Hattip applications. It can handle TypeScript, JSX, CSS, and more out of the box, and can be extended via the rich Vite plugin ecosystem. It can also serve/build client-side assets for seamless full-stack development.

For development, Hattip CLI runs your application on Node. You can start a development server by running `hattip serve` on your project root. `hattip dev` and just `hattip` are aliases for this command. It expects three entry points, all of which are optional:

```bash
# Start development server
hattip serve ./hattip-entry.js --node ./node-entry.js --client ./client-entry.js
# Build
hattip build ./hattip-entry.js --node ./node-entry.js --client ./client-entry.js
```

Entries are relative to the project root. You can import `node_modules` directly with bare imports like `hattip my-framework/hattip-entry`.

## Hattip entry

The **Hattip entry** is the entry point for your Hattip application. It is expected to default export a Hattip handler, for example:

```js
import { createRouter } from "@hattip/router";

const app = createRouter();

app.get("/", () => new Response("Hello world!"));

export default app.buildHandler();
```

This entry point is required but you don't have to specify it explicitly. If you don't, Hattip CLI will scan the project root and the `src`, `server`, and `src/server` directories for several file names like `entry-hattip`, `server`, `entry-server`, `entry.hattip`, `entry.server`, `index`, `index.hattip`, and `index.server` with the following extensions: `.ts`, `.tsx`, `.mts`, `.mjs`, `.js`, `.jsx`.

## Node entry

Optionally, you can specify a **Node entry**. It is expected to import the Hattip handler from the Hattip entry, turn it into a Node handler using `createMiddleware` from the `@hattip/adapter-node` package and export it as the default export.

If not explicitly specified, Hattip CLI will look for a file named `entry-node`, `entry.node`, `index.node` with `.ts`, `.tsx`, `.mts`, `.mjs`, `.js`, `.jsx` extension in the project root or the `src`, `server`, or `src/server` directories. If not found, it will use the following default:

```js
import handler from "<Name of your Hattip entry file>";
import { createMiddleware } from "@hattip/adapter-node";
export default createMiddleware(handler);
```

You can customize this entry to integrate with Express or other Connect-compatible Node frameworks:

```js
import { createMiddleware } from "@hattip/node-adapter";
import hattipHandler from "<Name of your Hattip entry file>";
import express from "express";

const app = express();

// Here you can add Express routes and middleware
// app.get(...);
// app.use(...);

// Use the Hattip handler
app.use(createMiddleware(hattipHandler));

// An Express app is actually a request handler function
// so we can simply default export it:
export default app;
```

Another use case is to emulate other environments. Since Hattip always runs your application on Node.js during development, platform-specific APIs like, say Cloudflare Workers KV stores are not available. The Node entry is the place where you can polyfill them e.g. using [`@miniflare/kv`](https://github.com/cloudflare/miniflare/tree/master/packages/kv).

For example, to simulate a D1 database with the binding `CLOUDFLARE_DB` during development:

```ts
// src/entry-node.ts
import { createMiddleware } from "@hattip/node-adapter";
import hattipHandler from "./entry-hattip";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";
import { createSQLiteDB } from "@miniflare/shared";
import fs from "node:fs";

fs.mkdirSync("./data", { recursive: true });

const dbPromise = Promise.resolve()
  .then(() => createSQLiteDB("./data/data.db"))
  .then((sqliteDb) => new D1Database(new D1DatabaseAPI(sqliteDb)));

export default createMiddleware(async (ctx) => {
  const db = await dbPromise;
  ctx.platform.env = ctx.platform.env ?? {};
  ctx.platform.env.CLOUDFLARE_DB = db;
  return hattipHandler(ctx);
});
```

## Client entries

You can provide one or more client entry points with the `--client` (`-C` for short) CLI option. Multiple entries can be specified by using the option multiple times (`hattip serve -C ./entry-1.js -C ./entry-2.js`). If you don't provide any, Hattip CLI will not build or serve client-side assets. If you're using a Vite plugin that injects its own client entry (such as `vite-plugin-ssr`), you can just specify `--client` without any value to enable serving/building client-side assets.

## Using adapters

TODO

## Credits

- Parts of the CLI are based on [Vite CLI](https://github.com/vitejs/vite/tree/main/packages/vite) by Yuxi (Evan) You and Vite contributors, used under [MIT License](./vite-license.md). They are not affiliated with this project.
