# `@hattip/adapter-cloudflare-workers`

HatTip adapter for [Bun](https://bun.sh).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an `entry-bun.js` file like the following and use `bun entry-bun.js` to run it:

```ts
import bunAdapter from "@hattip/adapter-bun";
import handler from "./handler.js";

export default bunAdapter(handler);
```
