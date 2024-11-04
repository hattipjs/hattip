import { it, expect } from "vitest";
import { modifyHeaders } from "./modify-headers";

it("modifies mutable headers", () => {
	const response = new Response("body", {
		headers: { "Some-Header": "value" },
	});

	const modified = modifyHeaders(response, (headers) => {
		headers.set("Some-Header", "modified");
		headers.set("New-Header", "new");
	});

	expect(modified).toBe(response); // Should be in-place
	expect(modified.headers.get("Some-Header")).toBe("modified");
	expect(modified.headers.get("New-Header")).toBe("new");
});

it("modifies immutable headers", () => {
	const response = Response.redirect("http://example.com");

	const modified = modifyHeaders(response, (headers) => {
		headers.set("Some-Header", "modified");
	});

	expect(modified).not.toBe(response); // Should not be in-place
	expect(modified.headers.get("Some-Header")).toBe("modified");
});
