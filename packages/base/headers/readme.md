# `@hattip/headers`

Header manipulation, parsing, and content negotiation utilities for Hattip.

## `modifyHeaders`

Some `Response` objects have an immutable `headers` property. `Response.redirect()`, for instance, creates such an object. When the headers are immutable, a naive middleware to modify the headers will fail:

```js
async function naivePoweredBy(ctx) {
  const response = await ctx.next();
  // The following line will throw an error if `response.headers` is immutable
  response.headers.set("X-Powered-By", "Hattip");
  return response;
}
```

The `modifyHeaders` function solves this problem by trying to modify the headers in place, and if that fails, creating a new `Response` object and trying again:

```js
async function correctPoweredBy(ctx) {
  let response = await ctx.next();
  response = modifyHeaders(response, (headers) => {
    headers.set("X-Powered-By", "Hattip");
  });

  return response;
}
```

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

## `accept`

Performs content negotiation on the `Accept` header:

```ts
const handler = accept("text/html, application/json", {
  "text/html": () => html("<h1>Hello world!</h1>"),
  "application/json": () => json({ message: "Hello world!" }),
  "*": () => new Response("Unacceptable", { status: 406 }),
});

const response = handler();
console.assert(response.headers.get("content-type") === "text/html");
```

`q` values and subtype and type wildcards requests are supported.

## `acceptLanguage`

Performs content negotiation on the `Accept-Language` header:

```ts
const handler = acceptLanguage("en-US, fr;q=0.8", {
  "en-US": () => "Hello!",
  fr: () => "Bonjour!",
  "*": () => "Hello!",
});

const result = handler();
console.assert(result === "Hello!");
```
