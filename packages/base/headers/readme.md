# `@hattip/headers`

> ⚠️ This package is work in progress. Please don't use in user-facing production code as it may have security issues.

Header parsing utilities for HatTip. Currently, this package exports one function for parsing header values and directives:

## `parseHeaderValue`

`parseHeaderValue` parses a header value and returns an array of objects with a `value` and `directives` property. Each object represents a value (comma-separated) and its directives (semicolon-separated). It understands basic quoting and comments between parentheses.

```ts
const parsed = parseHeaderValue(`en-US, en;q=0.9, fr;q=0.8`);

assert.deepStrictEqual(parsed, [
  { value: "en-US", directives: {} },
  { value: "en", directives: { q: "0.9" } },
  { value: "fr", directives: { q: "0.8" } },
]);
```
