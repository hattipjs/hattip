# `@hattip/adapter-netlify-edge`

HatTip adapter for [Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-netlify`](../../bundler/bundler-netlify) or your favorite bundler to bundle it:

```js
import netlifyEdgeAdapter from "@hattip/adapter-netlify-edge";
import handler from "./handler.js";

export default netlifyEdgeAdapter(handler);
```

## `context.platform`

This adapter passes the [Netlify edge function context object](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/api/#netlify-specific-context-object) as `context.platform`. The type definitions are currently rudimentary and likely incomplete/inaccurate.
