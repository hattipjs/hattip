import { test, expect } from "vitest";
import { parseHeaderValue } from ".";

test("parses empty string", () => {
	const parsed = parseHeaderValue("");
	expect(parsed).toStrictEqual([]);
});

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

test("trims names", () => {
	const parsed = parseHeaderValue(`  form-data  ;  name  =  "files"  `);

	expect(parsed).toStrictEqual([
		{
			value: "form-data",
			directives: {
				name: "files",
			},
		},
	]);
});

test("parses empty directive", () => {
	const parsed = parseHeaderValue(`value; ;`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: {},
		},
	]);
});

test("parses directive with no value", () => {
	const parsed = parseHeaderValue(`value; foo;`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: {
				foo: null,
			},
		},
	]);
});

test("parses main value comment", () => {
	const parsed = parseHeaderValue(`value (comment) ; foo = bar`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: { foo: "bar" },
		},
	]);
});

test("parses directive comment", () => {
	const parsed = parseHeaderValue(`value; foo (comment);`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: {
				foo: null,
			},
		},
	]);
});

test("parses unclosed quote", () => {
	const parsed = parseHeaderValue(`value; foo="bar`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: {
				foo: "bar",
			},
		},
	]);
});

test("parses unclosed comment", () => {
	const parsed = parseHeaderValue(`value (comment; not-attr`);
	expect(parsed).toStrictEqual([
		{
			value: "value",
			directives: {},
		},
	]);
});
