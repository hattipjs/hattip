import { test, expect } from "vitest";
import { Handler } from "./types";
import { compose } from "./compose";
import * as nodeFetch from "node-fetch";

(globalThis as any).fetch = nodeFetch.default;
(globalThis as any).Request = nodeFetch.Request;
(globalThis as any).Headers = nodeFetch.Headers;
(globalThis as any).Response = nodeFetch.Response;

const notFoundHandler = async () => new Response("Not found", { status: 404 });

test("calls in order", async () => {
  const h1: Handler = () => new Response("1");
  const h2: Handler = () => new Response("2");

  const composed = compose(h1, h2);

  const r1 = await (
    await composed(new Request("http://example.com"), {
      next: notFoundHandler,
    } as any)
  )?.text();

  expect(r1).toEqual("1");
});

test("calls next", async () => {
  const h1: Handler = (req, ctx) => {
    if (req.url === "http://example.com/1") {
      return new Response("1");
    }
    return ctx.next();
  };

  const h2: Handler = (req, ctx) => {
    if (req.url === "http://example.com/2") {
      return new Response("2");
    }
    return ctx.next();
  };

  const h3: Handler = (req, ctx) => {
    if (req.url === "http://example.com/3") {
      return new Response("3");
    }
    return ctx.next();
  };

  const composed = compose(h1, h2, h3);

  const r1 = await (
    await composed(new Request("http://example.com/1"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r1).toEqual("1");

  const r2 = await (
    await composed(new Request("http://example.com/2"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r2).toEqual("2");

  const r3 = await (
    await composed(new Request("http://example.com/3"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r3).toEqual("3");

  const r4 = await await composed(new Request("http://example.com/nope"), {
    next: notFoundHandler,
  } as any);
  expect(r4?.status).toEqual(404);
});

test("calls next when null is returned", async () => {
  const h1: Handler = (req) => {
    if (req.url === "http://example.com/1") {
      return new Response("1");
    }
    return null;
  };

  const h2: Handler = (req) => {
    if (req.url === "http://example.com/2") {
      return new Response("2");
    }
    return null;
  };

  const h3: Handler = (req) => {
    if (req.url === "http://example.com/3") {
      return new Response("3");
    }
    return null;
  };

  const composed = compose(h1, h2, h3);

  const r1 = await (
    await composed(new Request("http://example.com/1"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r1).toEqual("1");

  const r2 = await (
    await composed(new Request("http://example.com/2"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r2).toEqual("2");

  const r3 = await (
    await composed(new Request("http://example.com/3"), {
      next: notFoundHandler,
    } as any)
  )?.text();
  expect(r3).toEqual("3");

  const r4 = await await composed(new Request("http://example.com/nope"), {
    next: notFoundHandler,
  } as any);
  expect(r4?.status).toEqual(404);
});

test("sets headers in middleware", async () => {
  const middleware: Handler = async (_, ctx) => {
    const response = await ctx.next();
    response.headers.set("x-test", "test");
    return response;
  };

  const handler: Handler = async () => new Response("test");

  const composed = compose(middleware, handler);

  const response = await composed(new Request("http://example.com"), {
    next: notFoundHandler,
  } as any);

  expect(response?.headers.get("x-test")).toEqual("test");
});

test("runs initial next", async () => {
  const middleware: Handler = async (_, ctx) => {
    const response = await ctx.next();
    response.headers.set("x-test", "test");
    return response;
  };

  const composed = compose(middleware);

  const response = await composed(new Request("http://example.com"), {
    next: notFoundHandler,
  } as any);

  expect(response?.headers.get("x-test")).toEqual("test");
});

test("flattens handlers", async () => {
  const h1: Handler = () => null;
  const h2: Handler = () => new Response("1");

  const composed = compose([h1, h2]);

  const r1 = await (
    await composed(new Request("http://example.com"), {
      next: notFoundHandler,
    } as any)
  )?.text();

  expect(r1).toEqual("1");
});
