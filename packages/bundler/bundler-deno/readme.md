# `@hattip/bundler-deno`

Hattip bundler for [Deno](https://deno.land). It uses [`esbuild`](https://esbuild.github.io) behind the scenes.

## CLI

```
hattip-deno <input> <output>

Bundle the Hattip app in <input> into <output> as a Deno module.

Options:
  -h, --help     Display this message
  -v, --version  Display version number
```

The input should be a Deno module similar to the following:

```js
import { createRequestHandler } from "@hattip/adapter-deno";
import handler from "./handler.js";

Deno.serve(createRequestHandler(handler), { port: 3000 });
```

If you want serve static files too, you can use the `serveDir` function. Assuming your static files are in the `public` directory, you can use the following:

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

The output is a Deno module that can be run with `deno run` or deployed to [Deno Deploy](https://deno.com/deploy).

## JavaScript API

🚧 TODO 🚧

Refer to the TypeScript for the time being.
