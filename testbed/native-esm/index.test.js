/// <reference types="vite/client" />

import { test, expect } from "vitest";
import fetch from "node-fetch";

// Pull in the routes so that tests rerun everytime routes change.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = import.meta.glob("./src/routes/*.ts");

const host = process.env.TEST_HOST || "http://localhost:3000";

test("renders HTML", async () => {
  const response = await fetch(host);
  const text = await response.text();

  let ip;

  if (new URL(host).hostname === "localhost") {
    ip = "127.0.0.1";
  } else {
    ip = await fetch("http://api.ipify.org").then((r) => r.text());
  }

  const EXPECTED = `<h1>Hello from Hattip!</h1><p>URL: <span>${
    host + "/"
  }</span></p><p>Your IP address is: <span>${ip}</span></p>`;
  expect(text).toContain(EXPECTED);
  expect(response.headers.get("content-type")).toEqual(
    "text/html; charset=utf-8",
  );
});

test("renders binary", async () => {
  const response = await fetch(host + "/binary");
  const text = await response.text();
  const EXPECTED = "This is rendered as binary with non-ASCII chars 😊";
  expect(text).toEqual(EXPECTED);
});

test("renders binary stream", async () => {
  const response = await fetch(host + "/bin-stream");
  const text = await response.text();
  expect(text).toEqual(
    "This is rendered as binary stream with non-ASCII chars 😊",
  );
});

test("echoes text", async () => {
  const response = await fetch(host + "/echo-text", {
    method: "POST",
    body: "Hello world! 😊",
  });
  const text = await response.text();
  expect(text).toEqual("Hello world! 😊");
});

test("echoes binary", async () => {
  const response = await fetch(host + "/echo-bin", {
    method: "POST",
    body: "ABC",
  });
  const text = await response.text();
  expect(text).toEqual("65, 66, 67");
});

test("sends multiple cookies", async () => {
  const response = await fetch(host + "/cookies");
  expect(response.headers.raw()["set-cookie"]).toMatchObject([
    "name1=value1",
    "name2=value2",
  ]);
});

test("sets status", async () => {
  const response = await fetch(host + "/status");
  expect(response.status).toEqual(201);
});

test("sends 404", async () => {
  const response = await fetch(host + "/not-found");
  expect(response.status).toEqual(404);
});
