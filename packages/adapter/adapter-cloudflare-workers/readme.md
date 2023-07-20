# `@hattip/adapter-cloudflare-workers`

HatTip adapter for [Cloudflare Workers](https://workers.cloudflare.com).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-cloudflare-workers`](../../bundler/bundler-cloudflare-workers) or your favorite bundler to bundle it:

```js
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./handler.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
```

If you don't need to serve static files, you can import the adapter from `@hattip/adapter-cloudflare-workers/no-static` instead. You will get an error if you use the default adapter but you don't set up `site = { bucket = "<YOUR STATIC FILES DIR>" }` in your `wrangler.toml`.

`@hattip/adapter-cloudflare-workers` uses the newer [modules format](https://blog.cloudflare.com/workers-javascript-modules) instead of the service worker format.

## `context.platform`

This adapter's platform context contains `env` and `context` properties as passed to the worker's `fetch` function.

## Environment variables

The `ctx.env()` function only returns bindings with a string value. Other bindings like KV or D1 will return `undefined`. You should use `ctx.platform.env` to access them instead.
