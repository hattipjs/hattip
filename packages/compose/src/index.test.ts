import { test, expect } from "vitest";
import * as nodeFetch from "node-fetch";
import { compose, RequestHandler } from ".";

(globalThis as any).fetch = nodeFetch.default;
(globalThis as any).Request = nodeFetch.Request;
(globalThis as any).Headers = nodeFetch.Headers;
(globalThis as any).Response = nodeFetch.Response;

test("calls in order", async () => {
  const h1: RequestHandler = () => new Response("1");
  const h2: RequestHandler = () => new Response("2");

  const composed = compose(h1, h2);

  const r1 = await (
    await composed({
      request: new Request("http://example.com"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();

  expect(r1).toEqual("1");
});

test("calls next", async () => {
  const h1: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/1") {
      return new Response("1");
    }
    return ctx.next();
  };

  const h2: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/2") {
      return new Response("2");
    }
    return ctx.next();
  };

  const h3: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/3") {
      return new Response("3");
    }
    return ctx.next();
  };

  const composed = compose(h1, h2, h3);

  const r1 = await (
    await composed({
      request: new Request("http://example.com/1"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r1).toEqual("1");

  const r2 = await (
    await composed({
      request: new Request("http://example.com/2"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r2).toEqual("2");

  const r3 = await (
    await composed({
      request: new Request("http://example.com/3"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r3).toEqual("3");

  const r4 = await await composed({
    request: new Request("http://example.com/nope"),
    passThrough() {
      /**/
    },
  } as any);

  expect(r4?.status).toEqual(404);
});

test("calls next when nothing is returned", async () => {
  const h1: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/1") {
      return new Response("1");
    }
  };

  const h2: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/2") {
      return new Response("2");
    }
  };

  const h3: RequestHandler = (ctx) => {
    if (ctx.request.url === "http://example.com/3") {
      return new Response("3");
    }
  };

  const composed = compose(h1, h2, h3);

  const r1 = await (
    await composed({
      request: new Request("http://example.com/1"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r1).toEqual("1");

  const r2 = await (
    await composed({
      request: new Request("http://example.com/2"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r2).toEqual("2");

  const r3 = await (
    await composed({
      request: new Request("http://example.com/3"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();
  expect(r3).toEqual("3");

  const r4 = await await composed({
    request: new Request("http://example.com/nope"),
    passThrough() {
      /**/
    },
  } as any);
  expect(r4?.status).toEqual(404);
});

test("sets headers in middleware", async () => {
  const middleware: RequestHandler = async (ctx) => {
    const response = await ctx.next();
    response.headers.set("x-test", "test");
    return response;
  };

  const RequestHandler: RequestHandler = async () => new Response("test");

  const composed = compose(middleware, RequestHandler);

  const response = await composed({
    request: new Request("http://example.com"),
    passThrough() {
      /**/
    },
  } as any);

  expect(response?.headers.get("x-test")).toEqual("test");
});

test("runs initial next", async () => {
  const middleware: RequestHandler = async (ctx) => {
    const response = await ctx.next();
    response.headers.set("x-test", "test");
    return response;
  };

  const composed = compose(middleware);

  const response = await composed({
    request: new Request("http://example.com"),
    passThrough() {
      /**/
    },
  } as any);

  expect(response?.headers.get("x-test")).toEqual("test");
});

test("flattens RequestHandlers", async () => {
  const h1: RequestHandler = () => undefined;
  const h2: RequestHandler = () => new Response("1");

  const composed = compose([h1, h2]);

  const r1 = await (
    await composed({
      request: new Request("http://example.com"),
      passThrough() {
        /**/
      },
    } as any)
  )?.text();

  expect(r1).toEqual("1");
});
