import { describe, expect, it } from "vitest";
import {
	createError,
	fromProblemJson,
	isHattipError,
	toProblemJson,
	transmuteIntoHattipError,
	type HattipError,
} from "./index.ts";

describe("createError", () => {
	it("creates an error with the correct properties", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			title: "something went wrong",
			payload: undefined,
		});

		expect(error).toBeInstanceOf(Error);
		expect(error.isHattipError).toBe(true);
		expect(error.code).toBe("HTE_UNKNOWN");
		expect(error.title).toBe("something went wrong");
		expect(error.message).toBe("something went wrong");
		expect(error.payload).toBeUndefined();
		expect(error.status).toBeUndefined();
	});

	it("uses the correct constructor based on category", () => {
		const typeErr = createError({
			code: "HTE_UNKNOWN",
			category: "type",
			payload: undefined,
		});
		expect(typeErr).toBeInstanceOf(TypeError);

		const rangeErr = createError({
			code: "HTE_UNKNOWN",
			category: "range",
			payload: undefined,
		});
		expect(rangeErr).toBeInstanceOf(RangeError);

		const syntaxErr = createError({
			code: "HTE_UNKNOWN",
			category: "syntax",
			payload: undefined,
		});
		expect(syntaxErr).toBeInstanceOf(SyntaxError);

		const uriErr = createError({
			code: "HTE_UNKNOWN",
			category: "uri",
			payload: undefined,
		});
		expect(uriErr).toBeInstanceOf(URIError);
	});

	it("sets status when provided", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			status: 404,
			payload: undefined,
		});
		expect(error.status).toBe(404);
	});
});

describe("isHattipError", () => {
	it("returns true for a HattipError", () => {
		const error = createError({ code: "HTE_UNKNOWN", payload: undefined });
		expect(isHattipError(error)).toBe(true);
	});

	it("returns true when code matches", () => {
		const error = createError({ code: "HTE_UNKNOWN", payload: undefined });
		expect(isHattipError(error, "HTE_UNKNOWN")).toBe(true);
	});

	it("returns false when code does not match", () => {
		const error = createError({ code: "HTE_UNKNOWN", payload: undefined });
		expect(isHattipError(error, "NONEXISTENT" as any)).toBe(false);
	});

	it("returns false for a plain Error", () => {
		expect(isHattipError(new Error("plain"))).toBe(false);
	});

	it("returns false for non-Error values", () => {
		expect(isHattipError(null)).toBe(false);
		expect(isHattipError(undefined)).toBe(false);
		expect(isHattipError("string")).toBe(false);
		expect(isHattipError(42)).toBe(false);
		expect(isHattipError({})).toBe(false);
	});
});

describe("transmuteIntoHattipError", () => {
	it("mutates an existing error into a HattipError", () => {
		const error = new Error("original");
		transmuteIntoHattipError(error, {
			code: "HTE_UNKNOWN",
			payload: undefined,
		});

		const hattipError = error as HattipError<"HTE_UNKNOWN">;
		expect(hattipError.isHattipError).toBe(true);
		expect(hattipError.code).toBe("HTE_UNKNOWN");
		expect(hattipError.payload).toBeUndefined();
		expect(isHattipError(error)).toBe(true);
	});

	it("preserves the original message and stack", () => {
		const error = new Error("keep this message");
		const originalStack = error.stack;
		transmuteIntoHattipError(error, {
			code: "HTE_UNKNOWN",
			payload: undefined,
		});

		expect(error.message).toBe("keep this message");
		expect(error.stack).toBe(originalStack);
	});
});

describe("toProblemJson", () => {
	it("returns generic 500 when not debug and no status", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			title: "internal",
			payload: undefined,
		});
		const json = toProblemJson(error);

		expect(json).toEqual({ status: 500 });
	});

	it("serializes with status set", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			title: "not found",
			status: 404,
			detail: "resource missing",
			payload: undefined,
		});
		const json = toProblemJson(error);

		expect(json).toMatchObject({
			type: "https://hattipjs.org/public/errors/HTE_UNKNOWN",
			title: "not found",
			status: 404,
			detail: "resource missing",
			code: "HTE_UNKNOWN",
		});
	});

	it("exposes all fields in debug mode even without status", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			title: "debug error",
			payload: undefined,
		});
		const json = toProblemJson(error, true);

		expect(json).toMatchObject({
			type: "https://hattipjs.org/public/errors/HTE_UNKNOWN",
			title: "debug error",
			status: 500,
			code: "HTE_UNKNOWN",
		});
		expect((json as any).stack).toBeDefined();
	});

	it("omits stack in non-debug mode", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			status: 400,
			payload: undefined,
		});
		const json = toProblemJson(error);

		expect((json as any).stack).toBeUndefined();
	});

	it("uses custom code prefix to URL prefix mapping", () => {
		const error = createError<any>({
			code: "MYAPP_NOT_FOUND",
			status: 404,
			payload: undefined,
		} as any);
		const json = toProblemJson(error, false, {
			MYAPP: "https://example.com/errors",
		});

		expect(json).toMatchObject({
			type: "https://example.com/errors/MYAPP_NOT_FOUND",
		});
	});

	it("sets type to undefined for unknown prefixes without mapping", () => {
		const error = createError<any>({
			code: "OTHER_ERROR",
			status: 400,
			payload: undefined,
		} as any);
		const json = toProblemJson(error);

		expect((json as any).type).toBeUndefined();
	});

	it("includes category and payload", () => {
		const error = createError({
			code: "HTE_UNKNOWN",
			status: 400,
			category: "type",
			payload: undefined,
		});
		const json = toProblemJson(error);

		expect((json as any).category).toBe("type");
	});
});

describe("fromProblemJson", () => {
	it("round-trips through toProblemJson and fromProblemJson", () => {
		const original = createError({
			code: "HTE_UNKNOWN",
			title: "not found",
			status: 404,
			detail: "resource missing",
			category: "type",
			payload: undefined,
		});
		const json = toProblemJson(original);
		const restored = fromProblemJson(json);

		expect(restored).toBeInstanceOf(TypeError);
		expect(isHattipError(restored, "HTE_UNKNOWN")).toBe(true);
		expect(restored.title).toBe("not found");
		expect(restored.status).toBe(404);
		expect(restored.detail).toBe("resource missing");
	});

	it("falls back to HTE_UNKNOWN for unrecognized type URL", () => {
		const restored = fromProblemJson({
			type: "https://unknown.example.com/errors/FOO_BAR",
			title: "unknown",
			status: 400,
		});

		expect(isHattipError(restored, "HTE_UNKNOWN")).toBe(true);
		expect(restored.title).toBe("unknown");
		expect(restored.status).toBe(400);
	});

	it("falls back to HTE_UNKNOWN when type is absent", () => {
		const restored = fromProblemJson({
			title: "no type",
			status: 500,
		});

		expect(isHattipError(restored, "HTE_UNKNOWN")).toBe(true);
	});

	it("recognizes custom URL prefixes", () => {
		const restored = fromProblemJson(
			{
				type: "https://example.com/errors/MYAPP_NOT_FOUND",
				status: 404,
				code: "MYAPP_NOT_FOUND",
			} as any,
			["https://example.com/errors"],
		);

		expect(isHattipError(restored)).toBe(true);
		expect((restored as any).code).toBe("MYAPP_NOT_FOUND");
	});

	it("restores serverStack from debug json", () => {
		const original = createError({
			code: "HTE_UNKNOWN",
			status: 500,
			payload: undefined,
		});
		const json = toProblemJson(original, true);
		const restored = fromProblemJson(json);

		expect(restored.serverStack).toBeDefined();
	});
});
