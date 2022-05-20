# `@hattip/adapter-cloudflare-workers`

HatTip adapter for [Cloudflare Workers](https://workers.cloudflare.com).

> This is a low level package, we recommend using `@hattip/cloudflare-workers` for most use cases.

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-cloudflare-workers`](../bundler-cloudflare-workers) or your favorite bundler to bundle it:

```js
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./handler.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

If you don't need to serve static files, you can import the adapter from `@hattip/adapter-cloudflare-workers/no-static` instead. You will get an error if you don't do this and you don't setup `site = { bucket = "static-files-dir" }` in your `wrangler.toml`.

`@hattip/adapter-cloudflare-workers` uses the modern [modules format](https://blog.cloudflare.com/workers-javascript-modules) instead of the old service worker format.
