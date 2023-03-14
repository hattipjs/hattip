import { test, expect } from "vitest";
import { acceptLanguage } from "./accept-language";

test("accepts first", () => {
	const result = acceptLanguage("en-US, en;q=0.8", {
		en: "en",
		"en-US": "en-US",
	});

	expect(result).toBe("en-US");
});

test("sorts by q", () => {
	const result = acceptLanguage("en-US;q=0.8, en", {
		en: "en",
		"en-US": "en-US",
	});

	expect(result).toBe("en");
});

test("requested wildcard matches provided", () => {
	const result = acceptLanguage("*", {
		en: "en",
		"en-US": "en-US",
	});

	expect(result).toBe("en");
});

test("requested prefix matches provided", () => {
	const result = acceptLanguage("en", {
		"en-US": "en-US",
	});

	expect(result).toBe("en-US");
});

test("matches provided wildcard", () => {
	const result = acceptLanguage("en-US", {
		"*": "wildcard",
	});

	expect(result).toBe("wildcard");
});
