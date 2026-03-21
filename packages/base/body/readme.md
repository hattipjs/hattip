# @hattip/body

Body parsing utilities for [Hattip](https://github.com/hattipjs/hattip). Collects bytes, text, or JSON from any `AsyncIterable<Uint8Array>` (web `ReadableStream`, Node.js `Readable`, etc.) with configurable size limits and structured error handling via `@hattip/error`.

## Why not `Request.prototype.json()` etc.?

The built-in body consumption methods on `Request` and `Response` (`json()`, `text()`, `arrayBuffer()`, `bytes()`) are convenient but fall short for server-side use:

- **No size limits.** A malicious client can send an arbitrarily large body and your server will happily buffer it all into memory. This package checks the size limit incrementally as chunks arrive, rejecting oversized bodies early without buffering them fully.
- **No prototype poisoning protection.** `Request.prototype.json()` calls `JSON.parse` without a reviver, so payloads containing `__proto__` or `constructor.prototype` keys can pollute object prototypes.
- **UTF-8 only.** The spec hardcodes UTF-8. If you need to handle other encodings, you're on your own.
- **Opaque errors.** Parse failures throw generic `TypeError` or `SyntaxError` instances with no structured metadata, status codes, or error codes you can match on.

This package addresses all of the above while working on any `AsyncIterable<Uint8Array>` — not just `Request`/`Response` bodies.

## Installation

```sh
npm install @hattip/body
```

## Quick start

```ts
import { text, json, bytes, arrayBuffer, chunks } from "@hattip/body";

// Parse a request body as JSON
const body = await json(request.body, { exposeToClient: true });

// Parse as text
const str = await text(request.body, { exposeToClient: true });

// Collect raw bytes
const data = await bytes(request.body);
```

## Entry points

Importing `@hattip/body` selects the correct implementation automatically based on the runtime's `exports` conditions. You can also import a specific entry point directly:

- `@hattip/body/web` — Pure web-standard implementation. Used on Bun, Deno, Cloudflare Workers, and browsers.
- `@hattip/body/node` — Uses `Buffer` for small allocation optimizations specific to Node.js.
- `@hattip/body/detect` — Checks at runtime whether `Buffer` is available and re-exports from one of the above accordingly. This is the fallback when no runtime condition matches, but some bundlers treat a reference to `Buffer` as a signal to polyfill it. Use `web` or `node` directly when that's the case.

| Runtime condition | Resolved entry        |
| ----------------- | --------------------- |
| `bun`             | `@hattip/body/web`    |
| `deno`            | `@hattip/body/web`    |
| `workerd`         | `@hattip/body/web`    |
| `fastly`          | `@hattip/body/web`    |
| `node`            | `@hattip/body/node`   |
| `worker`          | `@hattip/body/web`    |
| `browser`         | `@hattip/body/web`    |
| (default)         | `@hattip/body/detect` |

## API

### `chunks(stream, options?)`

Collects the body into an array of `Uint8Array` chunks. Returns `[byteLength, chunks]`.

### `bytes(stream, options?)`

Collects the entire body into a single `Uint8Array`.

### `arrayBuffer(stream, options?)`

Collects the entire body into an `ArrayBuffer`.

### `text(stream, options?)`

Decodes the body into a string. Accepts `encoding`, `fatal`, and `ignoreBOM` options passed through to `TextDecoder`.

### `json(stream, options?)`

Decodes the body as text and parses it as JSON. The `reviver` option accepts a function or one of:

- `"error-on-unsafe"` (default) — throws on `__proto__` and `constructor.prototype` keys.
- `"drop-unsafe"` — silently drops unsafe keys.
- `"ignore-unsafe"` — no prototype poisoning protection.

When passing a custom reviver function, **you are responsible for prototype poisoning checks yourself.** Use `isUnsafeJsonKeyValuePair` to guard against unsafe keys:

```ts
import { json, isUnsafeJsonKeyValuePair } from "@hattip/body";

const body = await json(request.body, {
  exposeToClient: true,
  reviver(key, value) {
    if (isUnsafeJsonKeyValuePair(key, value)) {
      return undefined; // drop unsafe keys
    }
    // your custom logic here
    return value;
  },
});
```

### `blob(stream, options?)`

Collects the entire body into a `Blob`. The `type` and `endings` options are passed through to the `Blob` constructor.

### `isUnsafeJsonKeyValuePair(key, value)`

Returns `true` if the key/value pair would enable prototype pollution (`__proto__` or `constructor` with a `prototype` property). Use this in custom JSON revivers to maintain prototype poisoning protection.

## Options

All parsing functions accept a `BodyParsingOptions` object:

| Option           | Type      | Default            | Description                         |
| ---------------- | --------- | ------------------ | ----------------------------------- |
| `limit`          | `number`  | `1_048_576` (1 MB) | Maximum allowed body size in bytes. |
| `exposeToClient` | `boolean` | `false`            | Attach HTTP status codes to errors. |

### `exposeToClient`

When `true`, thrown `HattipError`s include an HTTP status code (`400`, `413`, `415`), making them safe to surface directly in responses.

- **Parsing incoming requests to your server** — set `exposeToClient: true` so the client receives meaningful error responses.
- **Parsing response bodies you fetched from elsewhere** — leave it `false` (the default) so internal parsing failures don't leak upstream status codes to your clients.

## Errors

All errors are thrown as `HattipError` instances from `@hattip/error`:

| Code                      | Status | When                                        |
| ------------------------- | ------ | ------------------------------------------- |
| `HTE_BODY_TOO_LARGE`      | 413    | Body exceeds the size limit.                |
| `HTE_INVALID_JSON`        | 400    | Body is not valid JSON.                     |
| `HTE_UNSAFE_JSON`         | 400    | JSON contains prototype-polluting keys.     |
| `HTE_UNSUPPORTED_CHARSET` | 415    | Encoding is not supported by `TextDecoder`. |

Status codes are only set when `exposeToClient` is `true`.
