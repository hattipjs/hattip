import { test, expect, describe, beforeAll } from "vitest";
import install from "./get-set-cookie";

describe("Headers.prototype.getSetCookie", () => {
	beforeAll(async () => {
		if (!globalThis.Headers) {
			await import("./node-fetch").then((nf) => nf.default());
		}
		install();
	});

	test("can retrieve multiple set-cookie headers", () => {
		const h = new Headers();
		h.append("Set-Cookie", "a=1");
		h.append("Set-Cookie", "b=2");
		expect(h.getSetCookie!()).toEqual(["a=1", "b=2"]);
	});

	test("can delete set-cookie headers", () => {
		const h = new Headers();
		h.append("Set-Cookie", "a=1");
		h.delete("Set-Cookie");
		expect(h.getSetCookie!()).toEqual([]);
	});

	test("can reset set-cookie headers", () => {
		const h = new Headers();
		h.append("Set-Cookie", "a=1");
		h.set("Set-Cookie", "b=2");
		expect(h.getSetCookie!()).toEqual(["b=2"]);
	});
});
