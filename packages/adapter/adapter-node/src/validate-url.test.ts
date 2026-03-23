import { it, expect, describe } from "vitest";

const DOT_SEGMENT_RE = /\/(?:\.|%2e)(?:\.|%2e)?(?:\/|$)/i;

function pathNeedsNormalization(path: string): boolean {
	return DOT_SEGMENT_RE.test(path);
}

describe("pathNeedsNormalization", () => {
	it("should detect . segments", () => {
		expect(pathNeedsNormalization("/a/./b")).toBe(true);
		expect(pathNeedsNormalization("/a/%2e/b")).toBe(true);
		expect(pathNeedsNormalization("/a/%2E/b")).toBe(true);
	});

	it("should detect .. segments", () => {
		expect(pathNeedsNormalization("/a/b/../c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2e%2e/c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2E%2E/c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/.%2e/c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/.%2E/c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2e./c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2e%2E/c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2E./c")).toBe(true);
		expect(pathNeedsNormalization("/a/b/%2E%2e/c")).toBe(true);
	});

	it("should detect .. above root", () => {
		expect(pathNeedsNormalization("/../a")).toBe(true);
		expect(pathNeedsNormalization("/a/../../b")).toBe(true);
		expect(pathNeedsNormalization("/a/%2e%2e/%2e%2e/c")).toBe(true);
	});

	it("should return false for paths without dot segments", () => {
		expect(pathNeedsNormalization("/a/b/c")).toBe(false);
		expect(pathNeedsNormalization("/")).toBe(false);
		expect(pathNeedsNormalization("/a.b/c")).toBe(false);
	});
});
