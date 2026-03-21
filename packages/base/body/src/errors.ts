import { createError } from "@hattip/error";

declare module "@hattip/error" {
	interface HattipErrorPayloads {
		HTE_UNSUPPORTED_CHARSET: { charset: string };
		HTE_BODY_TOO_LARGE: { limit: number };
		HTE_UNSAFE_JSON: { key: string };
		HTE_INVALID_JSON: undefined;
	}
}

export function createBodySizeLimitError(limit: number, expose = false) {
	return createError({
		category: "range",
		code: "HTE_BODY_TOO_LARGE",
		title: "Body too large",
		payload: { limit },
		detail: `Request body is larger than ${limit} bytes`,
		status: expose ? 413 : undefined,
	});
}

export function createUnsafeJsonError(key: string, expose = false) {
	return createError({
		category: "range",
		code: "HTE_UNSAFE_JSON",
		title: "Unsafe JSON",
		payload: { key },
		detail: `JSON contains forbidden key "${key}"`,
		status: expose ? 400 : undefined,
	});
}
