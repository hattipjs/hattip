/* eslint-disable @typescript-eslint/no-deprecated */
// Changing the body after it have been passed to Response/Request
// should not change the outcome of the consumed body

import { it, expect } from "vitest";
import { FastResponse } from "../src/fast-response";

const url = "http://a";
const method = "post";

it("FormData is cloned", async () => {
	const body = new FormData();
	body.set("a", "1");
	const res = new FastResponse(body);
	const req = new Request(url, { method, body });
	body.set("a", "2");
	expect((await res.formData()).get("a")).toBe("1");
	expect((await req.formData()).get("a")).toBe("1");
});

it("URLSearchParams is cloned", async () => {
	const body = new URLSearchParams({ a: "1" });
	const res = new FastResponse(body);
	const req = new Request(url, { method, body });
	body.set("a", "2");
	expect((await res.formData()).get("a")).toBe("1");
	expect((await req.formData()).get("a")).toBe("1");
});

it("TypedArray is cloned", async () => {
	const body = new Uint8Array([97]); // a
	const res = new FastResponse(body);
	const req = new Request(url, { method, body });
	body[0] = 98; // b
	expect(await res.text()).toBe("a");
	expect(await req.text()).toBe("a");
});

it("ArrayBuffer is cloned", async () => {
	const body = new Uint8Array([97]); // a
	const res = new FastResponse(body.buffer);
	const req = new Request(url, { method, body: body.buffer });
	body[0] = 98; // b
	expect(await res.text()).toBe("a");
	expect(await req.text()).toBe("a");
});

it("Blob is cloned", async () => {
	const body = new Blob(["a"]);
	const res = new FastResponse(body);
	const req = new Request(url, { method, body });
	expect((await res.blob()) !== body).toBe(true);
	expect((await req.blob()) !== body).toBe(true);
});
