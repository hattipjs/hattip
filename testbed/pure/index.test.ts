import { test, expect } from "vitest";
import fetch from "node-fetch";

const host = process.env.TEST_HOST || "http://localhost:3000";

test("renders HTML", async () => {
	const response = await fetch(host);
	const text = await response.text();
	expect(text).toContain("<h1>Hello from Hattip!</h1>");
});

test("renders binary", async () => {
	const response = await fetch(host + "/binary");
	const text = await response.text();
	expect(text).toEqual("This is rendered as binary with non-ASCII chars 😊");
});

test("renders string stream", async () => {
	const response = await fetch(host + "/str-stream");
	const text = await response.text();
	expect(text).toEqual(
		"This is rendered as a string stream with non-ASCII chars 😊",
	);
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
