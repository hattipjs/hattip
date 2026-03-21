import { describe, expect, it } from "vitest";
import { isHattipError } from "@hattip/error";
import {
	DEFAULT_BODY_SIZE_LIMIT,
	chunks,
	text,
	json,
	blob,
	isUnsafeJsonKeyValuePair,
} from "./common.ts";

function toStream(...parts: string[]): AsyncIterable<Uint8Array> {
	const encoder = new TextEncoder();
	const encoded = parts.map((p) => encoder.encode(p));
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of encoded) {
				yield chunk;
			}
		},
	};
}

function toByteStream(
	...arrays: Uint8Array<ArrayBuffer>[]
): AsyncIterable<Uint8Array> {
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of arrays) {
				yield chunk;
			}
		},
	};
}

function emptyStream(): AsyncIterable<Uint8Array> {
	return {
		async *[Symbol.asyncIterator]() {},
	};
}

describe("DEFAULT_BODY_SIZE_LIMIT", () => {
	it("is 1MB", () => {
		expect(DEFAULT_BODY_SIZE_LIMIT).toBe(1_048_576);
	});
});

describe("chunks", () => {
	it("returns empty array for empty stream", async () => {
		const [byteLength, parts] = await chunks(emptyStream());
		expect(byteLength).toBe(0);
		expect(parts).toEqual([]);
	});

	it("collects a single chunk", async () => {
		const stream = toStream("hello");
		const [byteLength, parts] = await chunks(stream);
		expect(byteLength).toBe(5);
		expect(parts).toHaveLength(1);
	});

	it("collects multiple chunks", async () => {
		const stream = toStream("hello", " ", "world");
		const [byteLength, parts] = await chunks(stream);
		expect(byteLength).toBe(11);
		expect(parts).toHaveLength(3);
	});

	it("throws HTE_BODY_TOO_LARGE when limit is exceeded", async () => {
		try {
			await chunks(toStream("hello world"), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});

	it("allows body exactly at the limit", async () => {
		const [byteLength] = await chunks(toStream("abcde"), { limit: 5 });
		expect(byteLength).toBe(5);
	});
});

describe("text", () => {
	it("decodes a single chunk", async () => {
		const result = await text(toStream("hello"));
		expect(result).toBe("hello");
	});

	it("concatenates multiple chunks", async () => {
		const result = await text(toStream("hello", " ", "world"));
		expect(result).toBe("hello world");
	});

	it("returns empty string for empty stream", async () => {
		const result = await text(emptyStream());
		expect(result).toBe("");
	});

	it("throws HTE_BODY_TOO_LARGE when limit is exceeded", async () => {
		try {
			await text(toStream("hello world"), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});

	it("does not set status when exposeToClient is false", async () => {
		try {
			await text(toStream("hello world"), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBeUndefined();
		}
	});

	it("sets status 413 when exposeToClient is true", async () => {
		try {
			await text(toStream("hello world"), {
				limit: 5,
				exposeToClient: true,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBe(413);
		}
	});

	it("checks limit incrementally across chunks", async () => {
		try {
			await text(toStream("abc", "def", "ghi"), { limit: 6 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});

	it("throws HTE_UNSUPPORTED_CHARSET for invalid encoding", async () => {
		try {
			await text(emptyStream(), { encoding: "not-a-charset" });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_UNSUPPORTED_CHARSET")).toBe(true);
		}
	});

	it("does not set status on charset error when exposeToClient is false", async () => {
		try {
			await text(emptyStream(), { encoding: "not-a-charset" });
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_UNSUPPORTED_CHARSET")) throw error;
			expect(error.status).toBeUndefined();
		}
	});

	it("sets status 415 on charset error when exposeToClient is true", async () => {
		try {
			await text(emptyStream(), {
				encoding: "not-a-charset",
				exposeToClient: true,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_UNSUPPORTED_CHARSET")) throw error;
			expect(error.status).toBe(415);
		}
	});

	it("supports latin1 encoding", async () => {
		// 0xe9 is é in latin1
		const stream = toByteStream(
			new Uint8Array([0xe9]) as Uint8Array<ArrayBuffer>,
		);
		const result = await text(stream, { encoding: "latin1" });
		expect(result).toBe("é");
	});

	it("allows body exactly at the limit", async () => {
		const result = await text(toStream("abcde"), { limit: 5 });
		expect(result).toBe("abcde");
	});
});

describe("json", () => {
	it("parses valid JSON", async () => {
		const result = await json(toStream('{"a":1}'));
		expect(result).toEqual({ a: 1 });
	});

	it("parses JSON spread across chunks", async () => {
		const result = await json(toStream('{"a":', "1}"));
		expect(result).toEqual({ a: 1 });
	});

	it("throws HTE_INVALID_JSON for malformed JSON", async () => {
		try {
			await json(toStream("{invalid}"));
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_INVALID_JSON")).toBe(true);
		}
	});

	it("does not set status on invalid JSON when exposeToClient is false", async () => {
		try {
			await json(toStream("{invalid}"));
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_INVALID_JSON")) throw error;
			expect(error.status).toBeUndefined();
		}
	});

	it("sets status 400 on invalid JSON when exposeToClient is true", async () => {
		try {
			await json(toStream("{invalid}"), { exposeToClient: true });
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_INVALID_JSON")) throw error;
			expect(error.status).toBe(400);
		}
	});

	it("throws HTE_UNSAFE_JSON on __proto__ by default", async () => {
		try {
			await json(toStream('{"__proto__":{"x":1}}'));
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_UNSAFE_JSON")).toBe(true);
		}
	});

	it("throws HTE_UNSAFE_JSON on constructor.prototype by default", async () => {
		try {
			await json(toStream('{"constructor":{"prototype":{"polluted":true}}}'));
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_UNSAFE_JSON")).toBe(true);
		}
	});

	it('drops unsafe keys with reviver "drop-unsafe"', async () => {
		const result = await json(toStream('{"__proto__":{"x":1},"safe":"yes"}'), {
			reviver: "drop-unsafe",
		});
		expect(result).toEqual({ safe: "yes" });
	});

	it('allows unsafe keys with reviver "ignore-unsafe"', async () => {
		const result = (await json(toStream('{"a":1}'), {
			reviver: "ignore-unsafe",
		})) as any;
		expect(result.a).toBe(1);
	});

	it('throws on unsafe with reviver "error-on-unsafe"', async () => {
		try {
			await json(toStream('{"__proto__":{"x":1}}'), {
				reviver: "error-on-unsafe",
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_UNSAFE_JSON")).toBe(true);
		}
	});

	it("supports custom reviver function", async () => {
		const result = await json(toStream('{"a":"1","b":"2"}'), {
			reviver(key, value) {
				if (key === "") return value;
				return Number(value);
			},
		});
		expect(result).toEqual({ a: 1, b: 2 });
	});

	it("propagates size limit errors", async () => {
		try {
			await json(toStream('{"a":1}'), { limit: 3 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});
});

describe("blob", () => {
	it("returns an empty blob for empty stream", async () => {
		const result = await blob(emptyStream());
		expect(result).toBeInstanceOf(Blob);
		expect(result.size).toBe(0);
	});

	it("collects stream into a blob", async () => {
		const result = await blob(toStream("hello"));
		expect(result.size).toBe(5);
		expect(await result.text()).toBe("hello");
	});

	it("sets the type option", async () => {
		const result = await blob(toStream("hello"), {
			type: "text/plain",
		});
		expect(result.type).toBe("text/plain");
	});

	it("throws HTE_BODY_TOO_LARGE when limit is exceeded", async () => {
		try {
			await blob(toStream("hello world"), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});
});

describe("isUnsafeJsonKeyValuePair", () => {
	it("returns true for __proto__", () => {
		expect(isUnsafeJsonKeyValuePair("__proto__", {})).toBe(true);
	});

	it("returns true for __proto__ with any value", () => {
		expect(isUnsafeJsonKeyValuePair("__proto__", null)).toBe(true);
		expect(isUnsafeJsonKeyValuePair("__proto__", "string")).toBe(true);
		expect(isUnsafeJsonKeyValuePair("__proto__", 42)).toBe(true);
	});

	it("returns true for constructor with prototype property", () => {
		expect(isUnsafeJsonKeyValuePair("constructor", { prototype: {} })).toBe(
			true,
		);
	});

	it("returns false for constructor without prototype", () => {
		expect(isUnsafeJsonKeyValuePair("constructor", { foo: 1 })).toBe(false);
	});

	it("returns false for constructor with non-object value", () => {
		expect(isUnsafeJsonKeyValuePair("constructor", "string")).toBe(false);
		expect(isUnsafeJsonKeyValuePair("constructor", null)).toBe(false);
		expect(isUnsafeJsonKeyValuePair("constructor", 42)).toBe(false);
	});

	it("returns false for safe keys", () => {
		expect(isUnsafeJsonKeyValuePair("name", "value")).toBe(false);
		expect(isUnsafeJsonKeyValuePair("toString", () => {})).toBe(false);
	});
});
