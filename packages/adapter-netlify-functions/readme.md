# `@hattip/adapter-netlify-functions`

HatTip adapter for [Netlify Functions](https://docs.netlify.com/functions/overview/).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-netlify`](../bundler-netlify) or your favorite bundler to bundle it:

```js
import netlifyFunctionsAdapter from "@hattip/adapter-netlify-functions";
import handler from "./handler.js";

export default netlifyFunctionsAdapter(handler);
```

## `fetch` implementation

This adapter uses [`node-fetch`](https://github.com/node-fetch/node-fetch) as its `fetch` implementation.

## `context.passThrough` behavior

Calling `context.passThrough` has no effect, the placeholder response will be returned.

## `context.platform`

This adapter's platform context contains the `event` and `context` properties which have the types `NetlifyFunctionEvent` and `NetlifyFunctionContext` respectively.
