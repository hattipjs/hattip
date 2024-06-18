import { test, expect, describe, beforeAll, afterAll } from "vitest";

describe.each([{ name: "native", Response }])("$name", ({ Response }) => {
	test("null", async () => {
		const response = new Response(null);
		const text = await response.text();
		expect(text).toBe("");
	});

	test("utf8", async () => {
		const response = new Response("😊");
		const text = await response.text();
		expect(text).toBe("😊");
	});
});
