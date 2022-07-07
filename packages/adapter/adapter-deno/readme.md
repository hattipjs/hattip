# `@hattip/adapter-deno`

HatTip adapter for [Deno](https://deno.land).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-deno`](../../bundler/bundler-deno) or your favorite bundler to bundle it:

```js
import { serve, createRequestHandler } from "@hattip/adapter-deno";
import handler from "./handler.js";

serve(createRequestHandler(handler), { port: 3000 });
```

## Serving static files

If you want to serve static files, you can use the `serveDir` function. Assuming your static files are in the `public` directory, you can use the following:

```js
import { serve, serveDir, createRequestHandler } from "@hattip/adapter-deno";
import hattipHandler from "./handler.js";

const handler = createRequestHandler(hattipHandler);

serve(
  async (request, connInfo) => {
    const staticResponse = await serveDir(request, { fsRoot: "./public" });

    if (staticResponse.status !== 404) {
      return staticResponse;
    }

    return handler(request, connInfo);
  },
  {
    port: 3000,
  },
);
```

## `context.platform`

`contex.platform.connInfo` is a [`ConnInfo`](https://doc.deno.land/https://deno.land/std@0.144.0/http/server.ts/~/ConnInfo) object.
