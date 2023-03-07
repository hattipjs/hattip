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

## `serverSentEvents`

Creates a response that emits server-sent events.

```js
serverSentEvents({
  onOpen(sink) {
    // Use `sink` to send events
    sink.send({ type: "custom", data: "Hello, world!", id: "1" });
    // Short hand for sending a message
    sink.sendMessage("Hello, world!");
  },
  onClose() {
    // You can use this to clean up resources
    // No more events can be sent after this is called
  },
});
```

`serverSentEvents` is intentionally very low-level. It doesn't handle data serialization (it only accepts strings), or keep track of connections, event IDs, or the `Last-Event-ID` header. But it is very flexible and allows you to implement your own logic for a full pub/sub system.

`serverSentEvents` works on all adapters that support streaming responses but since it requires a long-running server, using it with edge runtimes is not very useful. It leaves Node (optionally with uWebSockets.js) and Deno as the only real options. In particular, Bun and AWS-based serverless offerings of Netlify and Vercel don't support streaming responses.
