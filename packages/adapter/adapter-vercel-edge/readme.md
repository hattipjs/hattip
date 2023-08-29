# `@hattip/adapter-vercel-edge`

HatTip adapter for [Vercel Edge Functions](https://vercel.com/features/edge-functions).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-vercel`](../../bundler/bundler-vercel) or your favorite bundler to bundle it:

```js
import vercelEdgeAdapter from "@hattip/adapter-vercel-edge";
import handler from "./handler.js";

export default vercelEdgeAdapter(handler);
```

## `context.passThrough` behavior

The `vercelEdgeAdapter` function takes an optional second argument which is a boolean indicating whether the edge function is supposed to act like a middleware. It defaults to `false`. When `true`, calling `context.passThrough` will pass the request to the serverless function, otherwise, it will be ignored and the response will be returned as is.

## `context.platform`

This adapter's platform context contains the property `event` which is of type [`FetchEvent`](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent).
