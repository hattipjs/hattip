# `@hattip/router`

Express-style imperative router for HatTip.

## Usage

```js
import { compose } from "@hattip/compose";
import { createRouter } from "@hattip/router";

const router = createRouter();

router.get("/", () => new Response("Hello, world!"));

router.post("/echo", async (ctx) => new Response(await ctx.request.text()));

router.delete(
  "/book/:title",
  async (ctx) => new Response(`Deleted book: ${ctx.params.title}`),
);

export default compose(router.handlers);
```

## API

- `createRouter()`: Creates a new router.
- `router.<method>(path, handler)`: Adds a handler for the given method and path.

  `path` can be a string or a regular expression. If it's a string, parameters can be specified using `:` followed by the parameter name like `/book/:title`. `*` can be used to match any number of characters.

  `<method>` is the HTTP method in lowercase (e.g. `get`, `post`, `delete`).

  `handler` is a request handler.

- `router.all(path, handler)`: Adds a handler for all methods and the given path.
- `router.handlers`: Returns an array of handlers that can be passed to the `compose` function.

`@hattip/router` extends the `RequestContext` object with the following properties:

- `url`: A `URL` object representing the current URL. You can access, e.g., query parameters with `url.searchParams`.
- `method`: The HTTP method of the request (`"GET"`, `"POST"`, etc.).
- `params`: A map of parameters extracted from the path.

We recommend the use of `context.url` and `context.method` for URL rewriting and method overrides instead of `context.request.url` and `context.request.method` which are immutable.
