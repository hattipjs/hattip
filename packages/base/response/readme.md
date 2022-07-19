# `@hattip/response`

Response utilities for HatTip. This package exports three functions for creating several response types:

## `text`

Creates a response with the given text. The content type is set to `text/plain; charset=utf-8` unless explicitly specified.

```js
// Basic usage
text("Hello, world!");
// You can customize status and headers
text("Bad request", { status: 400 });
```

## `json`

Creates a response with the given JSON object. The content type is set to `application/json; charset=utf-8` unless explicitly specified.

```js
// Basic usage
json({ hello: "world" });
// You can customize status and headers
json({ error: "Nad request" }, { status: 400 });
```

## `html`

Creates a response with the given HTML string. The content type is set to `text/html; charset=utf-8` unless explicitly specified.

```js
// Basic usage
html("<h1>Hello, world!</h1>");
// You can customize status and headers
html("<h1>Bad request</h1>", { status: 400 });
```
