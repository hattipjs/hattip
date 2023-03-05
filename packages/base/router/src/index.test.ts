import { test, expect } from "vitest";
import { createRouter } from ".";
import { createTestClient, CreateTestClientArgs } from "@hattip/adapter-test";
import installNodeFetch from "@hattip/polyfills/node-fetch";

installNodeFetch();

test("finds simple routes", async () => {
	const router = createRouter();

	router.get("/a", () => new Response("A"));
	router.get("/b", () => new Response("B"));

	const fetch = createSimpleTestClient({
		handler: router.buildHandler(),
		baseUrl: "http://localhost",
	});

	expect(await fetch.text("/a")).toBe("A");
	expect(await fetch.text("/b")).toBe("B");

	expect(await fetch("/c")).toMatchObject({ status: 404 });
	expect(await fetch("/a", { method: "POST" })).toMatchObject({ status: 404 });
});

test("collects parameters", async () => {
	const router = createRouter();

	router.get(
		"/:param1/:param2",
		(context) => new Response(JSON.stringify(context.params)),
	);

	const fetch = createSimpleTestClient({
		handler: router.buildHandler(),
		baseUrl: "http://localhost",
	});

	expect(await fetch.json("/aaa/bbb")).toMatchObject({
		param1: "aaa",
		param2: "bbb",
	});
});

test("returning undefined calls next", async () => {
	const router = createRouter();

	router.get("/", async () => undefined);

	router.get("/", () => {
		return new Response("Hello");
	});

	const fetch = createSimpleTestClient({
		handler: router.buildHandler(),
		baseUrl: "http://localhost",
	});

	expect(await fetch.text("/")).toBe("Hello");
});

test("ctx.next works", async () => {
	const router = createRouter();

	router.get("/", async (context) => {
		const result = await context.next();
		result.headers.set("test", "true");
		return result;
	});

	router.get("/", () => new Response("Hello"));

	const fetch = createTestClient({
		handler: router.buildHandler(),
		baseUrl: "http://localhost",
	});

	const response = await fetch("/");

	expect(await response.text()).toBe("Hello");
	expect(response.headers.get("test")).toBe("true");
});

function createSimpleTestClient(options: CreateTestClientArgs): SimpleFetch {
	const fetch = createTestClient(options) as SimpleFetch;

	fetch.text = (input: string | Request, init?: RequestInit) =>
		fetch(input, init).then((r) => r.text());

	fetch.json = (input: string | Request, init?: RequestInit) =>
		fetch(input, init).then((r) => r.json());

	return fetch;
}

type SimpleFetch = typeof globalThis.fetch & {
	text: (input: string | Request, init?: RequestInit) => Promise<string>;
	json: (input: string | Request, init?: RequestInit) => Promise<any>;
};
