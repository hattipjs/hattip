# `@hattip/adapter-deno`

HatTip adapter for [Deno](https://deno.land). It requires Deno version 1.35.0 or higher.

## Usage

Assuming you have your HatTip handler defined in `handler.ts`, create an entry file like the following and run with `deno run -A entry.ts`:

```js
import { createServeHandler } from "npm:@hattip/adapter-deno";
import handler from "./handler.ts";

Deno.serve(createServeHandler(handler));
```

## Serving static files

If you want to serve static files, you can use the `serveDir` function from `std/http/file_server.ts`. Assuming your static files are in the `public` directory, you can use the following:

```js
import { createRequestHandler } from "npm:@hattip/adapter-deno";
import hattipHandler from "./handler.js";
import { serveDir } from "https://deno.land/std/http/file_server.ts";

const handler = createRequestHandler(hattipHandler);

Deno.serve(async (request, connInfo) => {
  const staticResponse = await serveDir(request, { fsRoot: "./public" });

  if (staticResponse.status !== 404) {
    return staticResponse;
  }

  return handler(request, connInfo);
});
```

## `context.platform`

`contex.platform.info` is a [`Deno.ServeHandlerInfo`](https://deno.land/api?s=Deno.ServeHandlerInfo) object.

## Environment variables

Usage of `ctx.env()` function requires `--allow-env` flag.
