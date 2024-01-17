# `@hattip/bundler-aws-lambda`

HatTip bundler for [AWS Lambda](https://aws.amazon.com/lambda). It uses [`esbuild`](https://esbuild.github.io) behind the scenes.

## CLI

```
Usage:
  $ hattip-aws-lambda <input> <output>

Commands:
  <input> <output>  Bundle the AWS Lambda Hattip app in <input> into <output> as a ZIP file for deployment

For more info, run any command with the `--help` flag:
  $ hattip-aws --help

Options:
  -c, --copy <path>  Copy the file/directory at <path> next to the output. Can be specified multiple times.
  --no-zip           Don't zip the output. <output> will then be the output directory. (default: true)
  -h, --help         Display this message
  -v, --version      Display version number
```

The input must be a module that exports an AWS handler entry similar to the following:

```js
import awsLambdaAdapter from "@hattip/adapter-aws-lambda";
// or import from "@hattip/adapter-aws-lambda/streaming" for streaming responses
import hattipHandler from "./handler.js";

export const handler = awsLambdaAdapter(hattipHandler);
```

The output is either a ZIP file or a directory containing the bundled app depending on whether the `--no-zip` flag is specified.

You can use the `--copy` flag to copy additional files or directories next to the output. This can be used for copying static assets to be served by the app.

## JavaScript API

```js
import { bundle } from "@hattip/bundler-aws-lambda";

// You can specify either `cfwEntry` or `handlerEntry` but not both.
await bundle({
  /** The entry point for the AWS Lambda handler */
  input: "path/to/entry.js",
  /** The output file or directory */
  output: "lambda.zip",
  /** Whether to zip the output */
  zip: true,
  /** Files or directories to copy next to the output */
  copy: ["path/to/public"],
});
```

The bundling function also accepts a second argument, a callback that is called with an esbuild options object for customizing the build.
