import { URLPattern as URLPatternPolyfill } from "urlpattern-polyfill";

export const fetch = globalThis.fetch;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
export const ReadableStream = globalThis.ReadableStream;
export const TextEncoder = globalThis.TextEncoder;
export const URLPattern = URLPatternPolyfill;

export function createFetch() {
	return {
		fetch,
		Request,
		Response,
		ReadableStream,
		URLPattern,
		TextEncoder,
	};
}
