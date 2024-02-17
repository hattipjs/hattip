# `@hattip/bundler-netlify`

Hattip bundler for [Netlify Functions](https://docs.netlify.com/functions/overview) and [Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions). It uses [`esbuild`](https://esbuild.github.io) behind the scenes.

## CLI

```
hattip-netlify
    Bundle a Hattip app for Netlify

For more info, run any command with the `--help` flag:
  $ hattip-netlify --help

Options:
  -o, --outputDir <path>  Root directory of the app
  -c, --clearOutputDir    Clear the output directory before bundling
  -s, --staticDir <path>  Static directory to copy to output
  -e, --edge <path>       Edge function entry file
  -S, --func <path>       Regular function entry file
  -h, --help              Display this message
  -v, --version           Display version number
```

The edge function entry should be in the following form:

```js
import netlifyEdgeAdapter from "@hattip/adapter-netlify-edge";
import handler from "./handler.js";

export default netlifyEdgeAdapter(handler);
```

The regular function entry should be in the following form:

```js
import netlifyFunctionsAdapter from "@hattip/adapter-netlify-functions";
import hattipHandler from "./handler.js";

export const handler = netlifyFunctionsAdapter(hattipHandler);
```

## JavaScript API

🚧 TODO 🚧

Refer to the TypeScript for the time being.
