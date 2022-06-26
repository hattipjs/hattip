# `@hattip/bundler-cloudflare-workers`

HatTip bundler for [Cloudflare Workers](https://workers.cloudflare.com). It uses [`esbuild`](https://esbuild.github.io) behind the scenes.

## CLI

```
hattip-cloudflare-workers [...options] <input> <output>

Bundle the HatTip app in <input> into <output> as a Clourflare Workers module.

Options:
  -e, --entry    Interpret <input> as a Cloudflare Workers module entry instead of a HatTip handler entry
  -h, --help     Display this message
  -v, --version  Display version number
```

The input can be either a module that default exports a HatTip handler entry or a Cloudflare Workers module similar to the following:

```js
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./handler.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

The output is a Clourflare Workers bundle that can be deployed with `wrangler` or tested with `miniflare --modules`.

## JavaScript API

```js
import bundler from "@hattip/bundler-cloudflare-workers";

// You can specify either `cfwEntry` or `handlerEntry` but not both.
bundler({
  // cfwEntry: "entry-cloudflare-workers.js",
  handlerEntry: "./handler.js",
  output: "./cfw-bundle.js",
}).then(() => {
  console.log("Bundle complete");
});
```

The bundling function also accepts a second argument, a callback that is called with an esbuild options object for customizing the build.
