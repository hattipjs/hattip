# @hattip/error

Structured, typed error handling for [Hattip](https://github.com/hattipjs/hattip) with [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807) `application/problem+json` serialization.

## Features

- Type-safe error codes with extensible payload types via declaration merging
- Error category support (`TypeError`, `RangeError`, `SyntaxError`, `URIError`)
- RFC 7807 `application/problem+json` serialization and deserialization
- Debug mode that exposes stack traces, production mode that hides internals

## Usage

### Creating errors

```ts
import { createError } from "@hattip/error";

const error = createError({
  code: "HTE_UNKNOWN",
  status: 404,
  title: "Not Found",
  detail: "The requested resource does not exist",
  payload: undefined,
});
```

### Transmuting existing errors

Attach Hattip error metadata to an existing `Error` instance in-place:

```ts
import { transmuteIntoHattipError } from "@hattip/error";

try {
  riskyOperation();
} catch (err) {
  transmuteIntoHattipError(err, {
    code: "HTE_UNKNOWN",
    status: 500,
    payload: undefined,
  });
  throw err; // now a HattipError
}
```

### Checking errors

```ts
import { isHattipError } from "@hattip/error";

if (isHattipError(error)) {
  // error is HattipError
}

if (isHattipError(error, "HTE_UNKNOWN")) {
  // error is HattipError<"HTE_UNKNOWN">
}
```

### RFC 7807 Problem Details

Serialize a `HattipError` into an `application/problem+json` response. Setting `status` on an error signals that it is safe to expose to the client. Without a `status`, non-debug mode returns a generic `{ status: 500 }` to avoid leaking internal details.

```ts
import { toProblemJson, fromProblemJson } from "@hattip/error";

const json = toProblemJson(error);

// Serialize in debug mode (includes stack traces)
const debugJson = toProblemJson(error, true);

// Deserialize back into a HattipError
const restored = fromProblemJson(json);
```

### Custom error codes

Register your own error codes with typed payloads using declaration merging:

```ts
declare module "@hattip/error" {
  interface HattipErrorPayloads {
    MYAPP_NOT_FOUND: { resourceId: string };
    MYAPP_INVALID_INPUT: { field: string; reason: string };
  }
}

const error = createError({
  code: "MYAPP_NOT_FOUND",
  status: 404,
  payload: { resourceId: "123" },
});
```

Map custom code prefixes to URL prefixes for the `type` field in Problem Details:

```ts
const json = toProblemJson(error, false, {
  MYAPP: "https://example.com/errors",
});
// type: "https://example.com/errors/MYAPP_NOT_FOUND"
```
