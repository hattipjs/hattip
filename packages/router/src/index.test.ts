import { Context } from "@hattip/core";
import { test, expect } from "vitest";
import { createRouter } from ".";

// Minimal mock to make `instanceof Response` work
globalThis.Response =
  globalThis.Response ||
  class {
    constructor(public body: string) {}
  };

test("finds simple routes", async () => {
  const router = createRouter();
  router.get("/a", () => new Response("A"));
  router.get("/b", () => new Response("B"));

  expect(
    await router.handler(makeRequest("GET", "/a"), makeContext()),
  ).toMatchObject({ body: "A" });
  expect(
    await router.handler(makeRequest("GET", "/b"), makeContext()),
  ).toMatchObject({ body: "B" });

  expect(
    await router.handler(makeRequest("GET", "/c"), makeContext()),
  ).toMatchObject({ status: 404 });
  expect(
    await router.handler(makeRequest("POST", "/a"), makeContext()),
  ).toMatchObject({ status: 404 });
});

test("collects parameters", async () => {
  const router = createRouter();
  router.get("/:param1/:param2", (request, context) => context.params as any);

  expect(
    await router.handler(makeRequest("GET", "/aaa/bbb"), makeContext()),
  ).toMatchObject({
    param1: "aaa",
    param2: "bbb",
  });
});

test("returning null works", async () => {
  const router = createRouter();

  router.get("/", async () => null);

  router.get("/", () => {
    return { body: "Hello" } as any;
  });

  expect(
    await router.handler(makeRequest("GET", "/"), makeContext()),
  ).toMatchObject({
    body: "Hello",
  });
});

test("ctx.next works", async () => {
  const router = createRouter();

  router.get("/", async (request, context) => {
    const result: Response = await context.next();
    (result as any).test = true;
    return result;
  });

  router.get("/", () => {
    return { body: "Hello" } as any;
  });

  expect(
    await router.handler(makeRequest("GET", "/"), makeContext()),
  ).toMatchObject({
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

function makeContext(): Context {
  return {
    next: () => Promise.resolve({ body: "Not Found", status: 404 }),
  } as any;
}
