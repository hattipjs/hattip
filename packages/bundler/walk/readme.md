# `@hattip/walk`

A utility package that walks a directory and generates a manifest of files for implementing static file servers.

There are two ways to use this package:

- You can either use one of the `walk`, `createFileSet`, `createFileMap`, or `createFileList` functions at runtime during server startup and use the result to implement a static file server,
- Or you can use the CLI or one of the `createFileSetModule`, `createFileListModule`, or `createCompressedFileListModule` functions to generate a manifest module at build time to improve cold start times in serverless environments.

## File name normalization

`@hattip/walk` normalizes file names to make them safe to use in the path portion of a URL.

## Manifest types

This tool can generate three types of manifests:

- A **file set manifest** is a simple set of file names.
- A **file map manifest** is a map of URL-normalized file names to file paths.
- A **file list manifest** is an array of tuples consisting of URL-normalized file names, paths, sizes, hashes, and optionally ETags.

### File set manifest

A file set manifest is generated using the `--set` flag or the `createFileSetModule` function. This is a module with the following interface:

```ts
const files: Set<string>;
export default files;
```

The exported set is a set of file paths similar to this:

```js
export default new Set([
  "/LICENSE",
  "/cli.js",
  "/package.json",
  "/readme.md",
  "/%D83D%DE42.txt", // 🙂.txt percent-encoded
]);
```

This type of manifest is useful when the platform offers a static file server but a quick check is needed to see if a file exists before calling the static file handler.

### File map manifest

A file map manifest is generated using the `--map` flag or the `createFileMapModule` function. This is a module with the following interface:

```ts
const files: Map<string, string | undefined>;
export default files;
```

Names that map to `undefined` are names that don't require normalization. Example output is like the following:

```ts
export default new Map([
  ["/LICENSE"],
  ["/cli.js"],
  ["/package.json"],
  ["/readme.md"],
  ["/%D83D%DE42.txt", "/🙂.txt"],
]);
```

### File list manifest

A file list manifest is generated when neither the `--set` nor the `--map` flag is used or by calling the `createFileListModule` function. This is a module with the following interface:

```ts
const files: Array<
  [
    name: string,
    path: string | undefined, // undefined for names that don't require normalization
    size: number,
    hash: string,
    etag?: string,
  ]
>;
export default files;
```

ETag generation can be disabled by passing `--no-etag` to the CLI or passing `false` for the relevant option in the `createFileListModule` function.

The exported list is an array of tuples similar to this:

```js
export default [
  [
    "/LICENSE",
    ,
    "application/octet-stream",
    1069,
    "10094a766eba8c1f9e9377874ad0832b12a9af93ec9ff08bee0d95e1fef9ae40",
  ],
  [
    "/cli.js",
    ,
    "application/javascript",
    44,
    "0779d059d458628cb4ab06c3e7d2a7e5b5e40698fce230c5aa0908bbb844f40b",
  ],
  [
    "/package.json",
    ,
    "application/json",
    1208,
    "e28324f872c5805cc5f36f261ecdba122b80df060d200edd4d2dc1a54af6217d",
  ],
  [
    "/readme.md",
    ,
    "text/markdown",
    5746,
    "3644ce0612c829bff249628b1f6dd23b4de62c5b3d1230ebceaccd6db8f9f69a",
  ],
  [
    "/%D83D%DE42.txt",
    "/🙂.txt",
    "text/plain",
    14,
    "df7a1ec45c1f8f13aa902a819a1d19d8707e6e8b5398803853d0489bf6d603c0",
  ],
];
```

By using the `--compress` CLI flag or by calling the `createCompressedFileListModule` function, you can generate a slightly compressed version of the manifest that doesn't repeat the content type for each file. This might be useful on platforms with size limits for the deployed code. Assuming ETag generation is disabled, the output looks like this (the second element is the index of the content type in the `types` array):

```ts
export default {
  types: [
    "application/octet-stream",
    "application/javascript",
    "application/json",
    "text/markdown",
    "text/plain",
  ],
  files: [
    ["/LICENSE", , 0, 1069],
    ["/cli.js", , 1, 44],
    ["/package.json", , 2, 1208],
    ["/readme.md", , 3, 5028],
    ["/%D83D%DE42.txt", "/🙂.txt", 4, 14],
  ],
};
```

The interface is like the following:

```ts
const manifest: {
  types: string[];
  files: Array<
    [
      name: string,
      path: string | undefined, // undefined for names that don't require normalization
      type: number,
      size: number,
      hash: string,
      etag?: string,
    ]
  >;
};

export default manifest;
```

## The `prune` option

By default, `@hattip/walk` skips `node_modules`, `dist`, and any file that starts with a dot except `.well-known`. You can override this with the `prune` option which accepts an array of strings or regular expressions. Regular expressions have to start and end with `/` when using the CLI.
