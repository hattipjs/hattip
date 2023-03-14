import { test, expect } from "vitest";
import { accept } from "./accept";

test("accepts first", () => {
	const result = accept("text/html, application/xhtml+xml", {
		"text/html": "html",
		"application/xhtml+xml": "xhtml",
	});

	expect(result).toBe("html");
});

test("sorts by q", () => {
	const result = accept("text/html;q=0.9, application/xhtml+xml", {
		"text/html": "html",
		"application/xhtml+xml": "xhtml",
	});

	expect(result).toBe("xhtml");
});

test("understands wildcards", () => {
	const result = accept("text/*, application/xhtml+xml", {
		"text/html": "html",
		"application/xhtml+xml": "xhtml",
	});

	expect(result).toBe("html");
});

test("understands wildcards in provided types", () => {
	const result = accept("text/html, application/xhtml+xml", {
		"application/json": "json",
		"text/plain": "text",
		"*": "wildcard",
	});

	expect(result).toBe("wildcard");
});
