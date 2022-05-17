# HatTip Core: `Request` => `Response`

HatTip handlers are JavaScript functions that take a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object and return a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object (or a `Promise` of one). Here are a few simple handler examples:

```js
const helloHandler = () => new Response("Hello world!");
const echoHandler = (request) => new Response(request.url);
const jsonHandler = () => new Response(JSON.stringify({ ping: "pong" }));
```

Handlers can accept a second `context` (`ctx` for short) argument meant to be used for storing various things without monkey-patching the `Request` object. For example a router can parse path parameters (e.g. `/user/:id`) and make them available in the `ctx.params` object.

If the handlers doesn't return a response, a generic `404` is returned.

For additional flexibility, instead of a `Response` object, a handler can return or throw anything with a `toResponse` method that returns a `Response` object.

That's it. This is the entirety of the HatTip API. Everything else is middleware functions that add various features.
