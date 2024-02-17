# `@hattip/router`

Express-style imperative router for Hattip.

## Usage

```js
import { createRouter } from "@hattip/router";
import { cookie } from "@hattip/cookie";

const app = createRouter();

// Add middleware
app.use(cookie());

// GET /
app.get("/", () => new Response("Hello, world!"));

// POST /echo
app.post("/echo", async (ctx) => new Response(await ctx.request.text()));

// DELETE /book/:title where :title is a route parameter
app.delete("/book/:title", async (ctx) => {
  // Parameters are available in ctx.params
  return new Response(`Deleted book: ${ctx.params.title}`);
});

export default app.buildHandler();
```

## API

- `createRouter()`: Creates a new router.
- `router.<method>(handler)`: Adds a handler for the given method and all paths.
- `router.<method>(path, handler)`: Adds a handler for the given method and path.

  `path` can be a string or a regular expression. If it's a string, parameters can be specified using `:` followed by the parameter name like `/book/:title`. `*` can be used to match any number of characters.

  `<method>` is the HTTP method in lowercase (e.g. `get`, `post`, `delete`).

  `handler` is a request handler.

- `router.use(path, handler)`: Adds a handler for all methods and the given path.
- `router.use(handler)`: Adds a handler for all methods and all paths.
- `router.handlers`: Returns an array of handlers.
- `router.buildHandler()`: Returns a handler that can be passed to an adapter.

`@hattip/router` extends the `RequestContext` object with a `params` property which contains a map of parameters extracted from a dynamic route.
