# `@hattip/adapter-bun`

HatTip adapter for [Bun](https://bun.sh).

## Usage

Assuming you have your HatTip handler defined in `handler.js` and your static assets are in the `public` directory, create an `entry-bun.js` file like the following and use `bun entry-bun.js` to run it:

```ts
import bunAdapter from "@hattip/adapter-bun";
import handler from "./handler.js";
import url from "url";
import path from "path";

const dir = path.resolve(
  path.dirname(url.fileURLToPath(new URL(import.meta.url))),
  "public",
);

export default bunAdapter(handler, { staticDir: dir });
```

You can leave out the `staticDir` option if you don't want to serve static assets.

## Options

- `staticDir`: The directory to serve static assets from. Leave undefined to not serve static assets.
- `trustProxy`: Whether to trust the `X-Forwarded-For` header.

The remaining options (`port`, `hostname` etc.) are passed to [Bun.serve](https://github.com/oven-sh/bun#bunserve---fast-http-server).

## Limitations

Bun support is preliminary and Bun itself is in early development:

- No way to determine the IP address of the client when `trustProxy` is false.
- No streaming, everything is cached.
