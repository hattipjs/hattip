import { describe, expect, it } from "vitest";
import { parseUrl } from ".";

const cases: UrlTestCase[] = [
	// Simple happy path cases
	{
		name: "handles all components",
		input: "https://example.com:3000/path?query=1",
		expected: "fast",
	},
	{
		name: "handles no port",
		input: "https://example.com/path?query=1",
		expected: "fast",
	},
	{
		name: "handles bare origin",
		input: "https://example.com",
		expected: "fast",
	},
	{
		name: "handles empty pathname",
		input: "https://example.com?query=1",
		expected: "fast",
	},

	// Protocol
	{
		name: "lowercases protocol",
		input: "HTTPS://example.com",
		expected: "fast",
	},
	{
		name: "falls back for non-http protocols",
		input: "ftp://example.com",
		expected: "slow",
	},

	// Hostname
	{
		name: "lowercases hostname",
		input: "https://EXAMPLE.com",
		expected: "fast",
	},
	{
		name: "falls back for percent-encoded hostname",
		input: "https://%65xample.com",
		expected: "slow",
	},
	{
		name: "falls back for international domain name",
		input: "https://şeş-beş.com",
		expected: "slow",
	},
	{
		name: "parses normal IPv4",
		input: "https://127.0.0.1",
		expected: "fast",
	},
	{
		name: "parses IPv4 with trailing dot",
		input: "https://127.0.0.1.",
		expected: "fast",
	},
	{
		name: "falls back for IPv6",
		input: "https://[::1]",
		expected: "slow",
	},
	{
		name: "falls back for unnormalized IPv4",
		input: "https://127.0.0.01",
		expected: "slow",
	},
	{
		name: "throws for number-like last segment",
		input: "https://example.123",
		expected: "throw",
	},
	{
		name: "throws for number-like last segment with trailing dot",
		input: "https://example.123.",
		expected: "throw",
	},
	{
		name: "falls back for weird IPv4 address",
		input: "https://0x7F.0x0.0x0.0x1",
		expected: "slow",
	},

	// Port
	{
		name: "removes leading zeroes from port",
		input: "https://example.com:03000",
		expected: "fast",
	},
	{
		name: "removes default port",
		input: "https://example.com:443",
		expected: "fast",
	},
	{
		name: "throws on invalid port",
		input: "https://example.com:abc",
		expected: "throw",
	},

	// Pathname
	{
		name: "handles percent-encoded pathname",
		input: "https://example.com/%E4%B8%AD%E6%96%87",
		expected: "fast",
	},
	{
		name: "falls back for dot segments in pathname",
		input: "https://example.com/a/b/./c",
		expected: "slow",
	},
	{
		name: "falls back for double dot segments in pathname",
		input: "https://example.com/a/b/../c",
		expected: "slow",
	},
	{
		name: "falls back for percent-encoded dot segments in pathname",
		input: "https://example.com/a/b/%2e/c",
		expected: "slow",
	},
	{
		name: "falls back for percent-encoded dot segments in pathname",
		input: "https://example.com/a/b/%2E/c",
		expected: "slow",
	},
	{
		name: "falls back for percent-encoded double dot segments in pathname",
		input: "https://example.com/a/b/%2e./c",
		expected: "slow",
	},
	{
		name: "falls back for mixed percent-encoded double dot segments",
		input: "https://example.com/a/b/.%2e/c",
		expected: "slow",
	},
	{
		name: "falls back for fully percent-encoded double dot segments",
		input: "https://example.com/a/b/%2E%2E/c",
		expected: "slow",
	},

	// Query
	{
		name: "handles query with multiple params",
		input: "https://example.com/path?a=1&b=2&c=3",
		expected: "fast",
	},
	{
		name: "handles empty query string",
		input: "https://example.com/path?",
		expected: "fast",
	},
	{
		name: "handles query with encoded characters",
		input: "https://example.com/path?q=%E4%B8%AD%E6%96%87",
		expected: "fast",
	},
	{
		name: "handles query with hash-like value encoded",
		input: "https://example.com/path?q=%23fragment",
		expected: "fast",
	},

	// Hash stripping
	{
		name: "strips hash from URL",
		input: "https://example.com/path#fragment",
		expected: "fast",
	},
	{
		name: "strips hash from URL with query",
		input: "https://example.com/path?q=1#fragment",
		expected: "fast",
	},
	{
		name: "strips empty hash",
		input: "https://example.com/path#",
		expected: "fast",
	},
	{
		name: "strips hash but preserves query",
		input: "https://example.com?q=1#frag",
		expected: "fast",
	},
];

describe("parseUrl", () => {
	it.each(cases)("$name", ({ input, expected }) => {
		if (expected === "throw") {
			expect(() => {
				const parsed = parseUrl(input);
				console.log("Parsed URL:", parsed.href);
			}).toThrow(TypeError);
			return;
		}

		const url = parseUrl(input);
		if (expected === "slow") {
			expect.assert.instanceOf(url, URL);
		} else {
			expect(url).not.toBeInstanceOf(URL);
			const reference = new URL(input);
			reference.hash = "";

			expect(url.href).toBe(reference.href);
			expect(url.origin).toBe(reference.origin);
			expect(url.host).toBe(reference.host);
			expect(url.protocol).toBe(reference.protocol);
			expect(url.hostname).toBe(reference.hostname);
			expect(url.port).toBe(reference.port);
			expect(url.pathname).toBe(reference.pathname);
			expect(url.search).toBe(reference.search);
		}
	});

	it("exhaustive test for pathname", () => {
		for (let i = 0; i <= 0xffff; i++) {
			const char = String.fromCharCode(i);

			if (char === "#" || char === "?") {
				continue; // These are tested in separate cases
			}

			const url = `https://example.com/a${char}b`;
			const shouldFallback = FORBIDDEN_PATHNAME_CHARS.has(i);

			const parsed = parseUrl(url);
			if (shouldFallback) {
				expect(
					parsed,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).toBeInstanceOf(URL);
			} else {
				expect(
					parsed,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).not.toBeInstanceOf(URL);
				expect(
					parsed.pathname,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).toBe(`/a${char}b`);
			}
		}
	});

	it("exhaustive test for search", () => {
		for (let i = 0; i <= 0xffff; i++) {
			const char = String.fromCharCode(i);

			if (char === "#") {
				continue; // Terminates query, tested in separate cases
			}

			const url = `https://example.com/path?a${char}b`;
			const shouldFallback = FORBIDDEN_SEARCH_CHARS.has(i);

			const parsed = parseUrl(url);
			if (shouldFallback) {
				expect(
					parsed,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).toBeInstanceOf(URL);
			} else {
				expect(
					parsed,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).not.toBeInstanceOf(URL);
				expect(
					parsed.search,
					`Failed for char: ${char} (0x${i.toString(16)})`,
				).toBe(`?a${char}b`);
			}
		}
	});
});

interface UrlTestCase {
	name: string;
	input: string;
	expected: "fast" | "slow" | "throw";
}

const FORBIDDEN_IN_BOTH = [
	// C0 control chars
	...Array(0x20).keys(),
	// DEL to FFFF
	...[...Array(0xffff - 0x7f + 1).keys()].map((i) => i + 0x7f),
	// U+0020 SPACE
	0x20,
	// U+0022 (")
	0x22,
	// U+0023 (#)
	0x23,
	// U+003C (<)
	0x3c,
	// U+003E (>)
	0x3e,
];

const FORBIDDEN_PATHNAME_CHARS = new Set([
	...FORBIDDEN_IN_BOTH,
	// U+003F (?)
	0x3f,
	// U+005E (^)
	0x5e,
	// U+0060 (`)
	0x60,
	// U+007B ({)
	0x7b,
	// U+007D (})
	0x7d,

	// U+005C (\)
	0x5c, // Allowed but must be replaced with forward slash

	// U+007C (|)
	0x7c, // Technically allowed but Chrome encodes it
]);

const FORBIDDEN_SEARCH_CHARS = new Set([
	...FORBIDDEN_IN_BOTH,

	// U+0027 (') (only forbidden in "special" URLs, which is all we support)
	0x27,
]);
