import { compose, RequestContext } from "@hattip/compose";
import { test, expect } from "vitest";
import { createRouter } from ".";

// Minimal mock to make `instanceof Response` work
globalThis.Response = class {
  public status: number;

  constructor(public body: string, options: any = {}) {
    this.status = options.status || 200;
  }
} as any;

test("finds simple routes", async () => {
  const router = createRouter();
  router.get("/a", () => new Response("A"));
  router.get("/b", () => new Response("B"));
  const handler = compose(router.handlers);

  expect(await handler(makeRequestContext("GET", "/a"))).toMatchObject({
    body: "A",
  });
  expect(await handler(makeRequestContext("GET", "/b"))).toMatchObject({
    body: "B",
  });

  expect(await handler(makeRequestContext("GET", "/c"))).toMatchObject({
    status: 404,
  });
  expect(await handler(makeRequestContext("POST", "/a"))).toMatchObject({
    status: 404,
  });
});

test("collects parameters", async () => {
  const router = createRouter();
  router.get("/:param1/:param2", (context) => context.params as any);
  const handler = compose(router.handlers);

  expect(await handler(makeRequestContext("GET", "/aaa/bbb"))).toMatchObject({
    param1: "aaa",
    param2: "bbb",
  });
});

test("returning null works", async () => {
  const router = createRouter();

  router.get("/", async () => undefined);

  router.get("/", () => {
    return { body: "Hello" } as any;
  });

  const handler = compose(router.handlers);

  expect(await handler(makeRequestContext("GET", "/"))).toMatchObject({
    body: "Hello",
  });
});

test("ctx.next works", async () => {
  const router = createRouter();

  router.get("/", async (context) => {
    const result: Response = await context.next();
    (result as any).test = true;
    return result;
  });

  router.get("/", () => {
    return { body: "Hello" } as any;
  });

  const handler = compose(router.handlers);

  expect(await handler(makeRequestContext("GET", "/"))).toMatchObject({
    body: "Hello",
    test: true,
  });
});

function makeRequest(method: string, url: string): Request {
  return {
    method,
    url: "http://localhost" + url,
  } as any;
}

function makeContext(request: Request): RequestContext {
  return {
    request,
    next: () => Promise.resolve({ body: "Not Found", status: 404 }),
    passThrough() {
      /**/
    },
  } as any;
}

function makeRequestContext(method: string, url: string) {
  return makeContext(makeRequest(method, url));
}
