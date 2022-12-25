# `@hattip/adapter-bun`

HatTip adapter for [Lagon](https://lagon.app/).

## Usage

Assuming you have your HatTip handler defined in `handler.js`, create an `entry-lagon.js` file like the following and use `lagon dev entry-lagon.js` to run it locally:

```ts
import lagonAdapter from "@hattip/adapter-lagon";
import hattipHandler from "./handler.js";

export const handler = lagonAdapter(hattipHandler);
```

The `lagon` command is provided by the `@lagon/cli` package. Lagon CLI takes care of the bundling, so you don't need a separate bundling step.

## Limitations

Lagon support is preliminary as Lagon itself is in early development.
