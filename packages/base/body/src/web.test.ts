import { describe, expect, it } from "vitest";
import { isHattipError } from "@hattip/error";
import { arrayBuffer, bytes } from "./web.ts";

function toStream(
	...parts: Uint8Array<ArrayBuffer>[]
): AsyncIterable<Uint8Array> {
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of parts) {
				yield chunk;
			}
		},
	};
}

function fromString(s: string): Uint8Array<ArrayBuffer> {
	return new TextEncoder().encode(s);
}

function emptyStream(): AsyncIterable<Uint8Array> {
	return {
		async *[Symbol.asyncIterator]() {},
	};
}

describe("bytes", () => {
	it("returns empty Uint8Array for empty stream", async () => {
		const result = await bytes(emptyStream());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBe(0);
	});

	it("collects a single chunk", async () => {
		const result = await bytes(toStream(fromString("hello")));
		expect(result.byteLength).toBe(5);
		expect(new TextDecoder().decode(result)).toBe("hello");
	});

	it("concatenates multiple chunks", async () => {
		const result = await bytes(
			toStream(fromString("hello"), fromString(" world")),
		);
		expect(new TextDecoder().decode(result)).toBe("hello world");
	});

	it("throws HTE_BODY_TOO_LARGE when limit is exceeded", async () => {
		try {
			await bytes(toStream(fromString("hello world")), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});

	it("does not set status when exposeToClient is false", async () => {
		try {
			await bytes(toStream(fromString("hello world")), { limit: 5 });
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBeUndefined();
		}
	});

	it("sets status 413 when exposeToClient is true", async () => {
		try {
			await bytes(toStream(fromString("hello world")), {
				limit: 5,
				exposeToClient: true,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBe(413);
		}
	});
});

describe("arrayBuffer", () => {
	it("returns empty ArrayBuffer for empty stream", async () => {
		const result = await arrayBuffer(emptyStream());
		expect(result).toBeInstanceOf(ArrayBuffer);
		expect(result.byteLength).toBe(0);
	});

	it("collects stream into ArrayBuffer", async () => {
		const result = await arrayBuffer(toStream(fromString("hello")));
		expect(result.byteLength).toBe(5);
		expect(new TextDecoder().decode(result)).toBe("hello");
	});

	it("throws HTE_BODY_TOO_LARGE when limit is exceeded", async () => {
		try {
			await arrayBuffer(toStream(fromString("hello world")), {
				limit: 5,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(isHattipError(error, "HTE_BODY_TOO_LARGE")).toBe(true);
		}
	});

	it("does not set status when exposeToClient is false", async () => {
		try {
			await arrayBuffer(toStream(fromString("hello world")), {
				limit: 5,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBeUndefined();
		}
	});

	it("sets status 413 when exposeToClient is true", async () => {
		try {
			await arrayBuffer(toStream(fromString("hello world")), {
				limit: 5,
				exposeToClient: true,
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			if (!isHattipError(error, "HTE_BODY_TOO_LARGE")) throw error;
			expect(error.status).toBe(413);
		}
	});
});
