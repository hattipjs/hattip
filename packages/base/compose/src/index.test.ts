import { test, expect } from "vitest";
import { compose, RequestHandler } from ".";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import { createTestClient } from "@hattip/adapter-test";

installNodeFetch();

test("calls in order", async () => {
	const h1: RequestHandler = () => new Response("1");
	const h2: RequestHandler = () => new Response("2");

	const composed = compose(h1, h2);

	const fetch = createTestClient({
		handler: composed,
		baseUrl: "http://example.com",
	});

	const r1 = await fetch("/").then((r) => r.text());

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

	const fetch = createTestClient({
		handler: compose(h1, h2, h3),
		baseUrl: "http://example.com",
	});

	const r1 = await fetch("http://example.com/1").then((r) => r.text());
	expect(r1).toEqual("1");

	const r2 = await fetch("http://example.com/2").then((r) => r.text());
	expect(r2).toEqual("2");

	const r3 = await fetch("http://example.com/3").then((r) => r.text());
	expect(r3).toEqual("3");

	const r4 = await fetch("http://example.com/nope");
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

	const fetch = createTestClient({
		handler: compose(h1, h2, h3),
		baseUrl: "http://example.com",
	});

	const r1 = await fetch("http://example.com/1").then((r) => r.text());
	expect(r1).toEqual("1");

	const r2 = await fetch("http://example.com/2").then((r) => r.text());
	expect(r2).toEqual("2");

	const r3 = await fetch("http://example.com/3").then((r) => r.text());
	expect(r3).toEqual("3");

	const r4 = await fetch("http://example.com/nope");
	expect(r4?.status).toEqual(404);
});

test("sets headers in middleware", async () => {
	const middleware: RequestHandler = async (ctx) => {
		const response = await ctx.next();
		response.headers.set("x-test", "test");
		return response;
	};

	const RequestHandler: RequestHandler = async () => new Response("test");

	const fetch = createTestClient({
		handler: compose(middleware, RequestHandler),
		baseUrl: "http://example.com",
	});

	const response = await fetch("http://example.com");
	expect(response.headers.get("x-test")).toEqual("test");
});

test("runs initial next", async () => {
	const middleware: RequestHandler = async (ctx) => {
		const response = await ctx.next();
		response.headers.set("x-test", "test");
		return response;
	};

	const fetch = createTestClient({
		handler: compose(middleware),
		baseUrl: "http://example.com",
	});

	const response = await fetch("http://example.com");
	expect(response?.headers.get("x-test")).toEqual("test");
});

test("flattens RequestHandlers", async () => {
	const h1: RequestHandler = () => undefined;
	const h2: RequestHandler = () => new Response("1");

	const fetch = createTestClient({
		handler: compose([h1, h2]),
		baseUrl: "http://example.com",
	});

	const r1 = await fetch("http://example.com").then((r) => r.text());
	expect(r1).toEqual("1");
});

test("installs default error handler", async () => {
	const h1: RequestHandler = () => {
		throw new Error("1");
	};

	const fetch = createTestClient({
		handler: compose(h1),
		baseUrl: "http://example.com",
	});

	const r = await fetch("http://example.com");
	expect(r.status).toEqual(500);
});

test("calls handleError", async () => {
	const h1: RequestHandler = (ctx) => {
		ctx.handleError = (error: any) => new Response(error.message);
	};
	const h2: RequestHandler = () => {
		throw new Error("1");
	};

	const fetch = createTestClient({
		handler: compose(h1, h2),
		baseUrl: "http://example.com",
	});

	const r = await fetch("http://example.com").then((r) => r.text());
	expect(r).toEqual("1");
});
