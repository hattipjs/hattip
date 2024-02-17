# `@hattip/bundler-vercel`

Hattip bundler for [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions#serverless-functions) and [Vercel Edge Functions](https://vercel.com/docs/concepts/functions#serverless-functions). It uses [`esbuild`](https://esbuild.github.io) behind the scenes.

## CLI

```
hattip-vercel
    Bundle a Hattip app for Vercel

Options:
  -o, --outputDir <path>   Root directory of the app
  -c, --clearOutputDir     Clear the output directory before bundling
  -s, --staticDir <path>   Static directory to copy to output
  -e, --edge <path>        Edge function entry file
  -S, --serverless <path>  Serverless function entry file
  -h, --help               Display this message
  -v, --version            Display version number
```

The edge function entry should be in the following form:

```js
import adapterVercel from "@hattip/adapter-vercel-edge";
import handler from "./handler.js";

export default adapterVercel(handler);
```

The serverless function entry should be in the following form:

```js
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./handler.js";

export default createMiddleware(handler, { trustProxy: true });
```

The bundler output (by default `.vercel/output`) is compatible with the [Vercel Build Output API (v3)](https://vercel.com/docs/build-output-api/v3).

## JavaScript API

🚧 TODO 🚧

Refer to the TypeScript for the time being.
