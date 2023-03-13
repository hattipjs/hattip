import { test, expect } from "vitest";
import { parseHeaderValue } from ".";

test("parses simple cases", () => {
	const parsed = parseHeaderValue(`en-US, en;q=0.9, fr;q=0.8`);

	expect(parsed).toStrictEqual([
		{ value: "en-US", directives: {} },
		{ value: "en", directives: { q: "0.9" } },
		{ value: "fr", directives: { q: "0.8" } },
	]);
});

test("parses complex cases", () => {
	const parsed = parseHeaderValue(
		`form-data; name="files"; filename="Weirdly Named File 😊.txt" (Some comment), "some other value"; foo="bar"`,
	);

	expect(parsed).toStrictEqual([
		{
			value: "form-data",
			directives: {
				name: "files",
				filename: "Weirdly Named File 😊.txt",
			},
		},
		{
			value: "some other value",
			directives: {
				foo: "bar",
			},
		},
	]);
});
