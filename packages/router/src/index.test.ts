import { test, expect } from "vitest";
import { createRouter } from ".";

test("finds simple routes", () => {
  const router = createRouter();
  router.get("/a", () => "A" as any);
  router.get("/b", () => "B" as any);

  expect(router.handler(makeRequest("GET", "/a"), {} as any)).resolves.toEqual(
    "A",
  );
  expect(router.handler(makeRequest("GET", "/b"), {} as any)).resolves.toEqual(
    "B",
  );

  expect(
    router.handler(makeRequest("GET", "/c"), {} as any),
  ).resolves.toBeUndefined();
  expect(
    router.handler(makeRequest("POST", "/a"), {} as any),
  ).resolves.toBeUndefined();
});

test("collects parameters", () => {
  const router = createRouter();
  router.get("/:param1/:param2", (request, context) => context.params as any);

  expect(
    router.handler(makeRequest("GET", "/aaa/bbb"), {} as any),
  ).resolves.toMatchObject({
    param1: "aaa",
    param2: "bbb",
  });
});

function makeRequest(method: string, url: string): Request {
  return {
    method,
    url: "http://localhost" + url,
  } as any;
}
