# `@hattip/adapter-netlify-functions`

Hattip adapter for [Netlify Functions](https://docs.netlify.com/functions/overview/).

## Usage

Assuming you have your Hattip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-netlify`](../../bundler/bundler-netlify) or your favorite bundler to bundle it:

```js
import netlifyFunctionsAdapter from "@hattip/adapter-netlify-functions";
import hattipHandler from "./handler.js";

export const handler = netlifyFunctionsAdapter(hattipHandler);
```

## `fetch` implementation

This adapter uses [`node-fetch`](https://github.com/node-fetch/node-fetch) as its `fetch` implementation.

## `context.passThrough` behavior

Calling `context.passThrough` has no effect, the placeholder response will be returned.

## `context.platform`

```ts
export interface NetlifyFunctionsPlatformInfo {
  name: "netlify-functions";
  event: NetlifyFunctionEvent;
  context: NetlifyFunctionContext;
}
```
