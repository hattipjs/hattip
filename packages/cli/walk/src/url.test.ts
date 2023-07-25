import { it, expect } from "vitest";
import { normalizePathSegment } from "./url";

it("encodes stray percent signs that are not followed by two hex digits", () => {
	expect(normalizePathSegment("%xy")).toBe("%25xy");
});

it("decodes percent-encoded chars that are allowed in pathnames", () => {
	expect(normalizePathSegment("%41%5B%5D%7C%5E")).toBe("A[]|^");
});

it("converts all percent encodings to uppercase", () => {
	expect(normalizePathSegment("%2f")).toBe("%2F");
});

it("encodes non-alllowed chars", () => {
	expect(normalizePathSegment('?#"<>`{}\\ş')).toBe(
		"%3F%23%22%3C%3E%60%7B%7D%5C%C5%9F",
	);
});

it("encodes . and ..", () => {
	expect(normalizePathSegment(".")).toBe("%2E");
	expect(normalizePathSegment("..")).toBe("%2E%2E");
	expect(normalizePathSegment("...")).toBe("...");
});

it("encodes backslashes", () => {
	expect(normalizePathSegment("\\")).toBe("%5C");
});

it("doesn't encode forward slashes", () => {
	expect(normalizePathSegment("%2F")).toBe("%2F");
});
