# `compose()`

The `compose` function can be used to compose multiple handlers into a single handler. Each handler is called in sequence until one returns a response. A handler can pass control to the next handler by returning `null` or calling `ctx.next()`. The latter allows the handler to modify the response before returning:

```js
import { compose } from "@hattip/core";

// Example of making things available in `ctx`
// Middleware to parse the URL into a URL object
const urlParser = (req, ctx) => {
  ctx.url = new URL();
  return null;
};

// Example of modifying the response
// Middleware to add an X-Powered-By header
const poweredBy = async (req, ctx) => {
  const response = await ctx.next();
  response.headers.set("X-Powered-By", "HatTip");
  return response;
};

const homeHandler = (req, ctx) => {
  if (ctx.url.pathname === "/") {
    return new Response("Home");
  } else {
    return null;
  }
};

const fooHandler = (req, ctx) => {
  if (ctx.url.pathname === "/foo") {
    return new Response("Foo");
  } else {
    return null;
  }
};

const barHandler = (req, ctx) => {
  if (ctx.url.pathname === "/bar") {
    return new Response("Bar");
  } else {
    return null;
  }
};

export default compose(
  urlParser,
  poweredBy,
  homeHandler,
  fooHandler,
  barHandler,
);
```
