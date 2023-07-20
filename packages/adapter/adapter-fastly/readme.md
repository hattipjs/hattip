# `@hattip/adapter-fastly`

HatTip adapter for [Fastly](https://developer.fastly.com/).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following:

```js
import fastlyAdapter from "@hattip/adapter-fastly";
import handler from "./handler.js";

export default fastlyAdapter(handler);
```

## Static assets

To serve static assets, scaffold a project with [Fastly Static Publisher](https://github.com/fastly/compute-js-static-publish). Put your HatTip handler in `src/handler.js` and replace `src/index.js` with the following:

```js
import fastlyAdapter from "@hattip/adapter-fastly";
import handler from "./handler.js";
import { getServer } from "./statics.js";
const staticContentServer = getServer();

export default fastlyAdapter(async (ctx) => {
  const response = await staticContentServer.serveRequest(ctx.request);
  if (response != null) {
    return response;
  }

  return handler(ctx);
});
```

## `context.platform`

```ts
export interface FastlyPlatformInfo {
  /** Platform name */
  name: "fastly-compute";
  /** Event object */
  event: FetchEvent;
}
```

## Limitations

- Fastly doesn't support constructing a `Request` object with a stream body.
- Fastly doesn't support the `AES-GCM` crypto algorithm used by `@hattip/session`'s `EncryptedCookieStore`.
