# `@hattip/adapter-netlify-edge`

Hattip adapter for [Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions).

## Usage

Assuming you have your Hattip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-netlify`](../../bundler/bundler-netlify) or your favorite bundler to bundle it:

```js
import netlifyEdgeAdapter from "@hattip/adapter-netlify-edge";
import handler from "./handler.js";

export default netlifyEdgeAdapter(handler);
```

## `context.platform`

```ts
interface NetlifyEdgePlatformInfo {
  /** Platform name */
  name: "netlify-edge";
  /** Netlify-specific context object */
  context: NetlifyContext;
}
```

See [Netlify's documentation](https://docs.netlify.com/functions/build-with-javascript/#synchronous-function-format) for the Netlify-specific context object.
