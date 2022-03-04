import { test, expect } from "vitest";
import { createRouter } from ".";

test("finds simple routes", () => {
  const app = createRouter();
  app.get("/a", () => "A" as any);
  app.get("/b", () => "B" as any);

  expect(app.handle(makeRequest("GET", "/a"), {} as any)).resolves.toEqual("A");
  expect(app.handle(makeRequest("GET", "/b"), {} as any)).resolves.toEqual("B");

  expect(
    app.handle(makeRequest("GET", "/c"), {} as any),
  ).resolves.toBeUndefined();
  expect(
    app.handle(makeRequest("POST", "/a"), {} as any),
  ).resolves.toBeUndefined();
});

test("collects parameters", () => {
  const app = createRouter();
  app.get("/:param1/:param2", (request, context) => context.params as any);

  expect(
    app.handle(makeRequest("GET", "/aaa/bbb"), {} as any),
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
