# `@hattip/adapter-fastly`

HatTip adapter for [Fastly](https://developer.fastly.com/).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an entry file like the following:

```js
import fastlyAdapter from "@hattip/adapter-fastly";
import handler from "./handler.js";

export default fastlyAdapter(handler);
```

## `context.platform`

This adapter's platform context contains a `client` object, which is [Fastly FetchEvent.client](https://js-compute-reference-docs.edgecompute.app/docs/globals/FetchEvent/#instance-properties).
