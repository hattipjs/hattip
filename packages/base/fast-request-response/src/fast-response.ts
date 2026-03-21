import { Body, type BodyInit, type NormalizedBody } from "./body";

export type ResponseType =
	| "default"
	| "error"
	| "basic"
	| "cors"
	| "opaque"
	| "opaqueredirect";

/**
 * Fast Response implementation to be used in Fetch API servers similar to Bun, Deno, Cloudflare in Node.js.
 *
 * It achieves performance by:
 *
 * - Allowing access to raw body (string, Uint8Array, or Blob) when streaming can be avoided.
 * - Preferring a Readable over ReadableStream where possible if streaming cannot be avoided.
 */
export class FastResponse implements Response {
	#body: Body;
	#headers: Headers;
	#status: number;
	#statusText: string;

	constructor(body: BodyInit = null, init?: ResponseInit) {
		let status = init?.status;
		if (status !== undefined) {
			status = status | 0;
			if (status < 200 || status >= 600) {
				throw new RangeError("Invalid status");
			}
		}

		const statusText = init?.statusText;
		if (statusText && !isValidStatusText(statusText)) {
			throw new TypeError("Invalid statusText");
		}

		this.#headers = new Headers(init?.headers);
		this.#status = status ?? 200;
		this.#statusText = statusText ?? "";
		this.#body = new Body(body, this.#headers, true);
	}

	static error: () => Response = Response.error;

	static redirect(
		url: string | URL,
		status: 301 | 302 | 303 | 307 | 308 = 302,
	): Response {
		return Response.redirect(url, status);
	}

	static json(data: any, init: ResponseInit = {}) {
		const headers = new Headers(init.headers);
		if (!headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}

		return new FastResponse(JSON.stringify(data), {
			...init,
			headers,
		});
	}

	get headers(): Headers {
		return this.#headers;
	}

	get ok(): boolean {
		return this.#status >= 200 && this.#status <= 299;
	}

	get status(): number {
		return this.#status;
	}

	get statusText(): string {
		return this.#statusText;
	}

	clone(): FastResponse {
		const body = this.#body.clone();
		return new FastResponse(body.getRawBody(), this);
	}

	//#region Body mixin members
	get bodyUsed(): boolean {
		return this.#body.bodyUsed;
	}

	get body(): ReadableStream<Uint8Array> | null {
		return this.#body.body;
	}

	arrayBuffer(): Promise<ArrayBuffer> {
		return this.#body.arrayBuffer();
	}

	blob(): Promise<Blob> {
		return this.#body.blob();
	}

	formData(): Promise<FormData> {
		return this.#body.formData();
	}

	text(): Promise<string> {
		return this.#body.text();
	}

	json(): Promise<unknown> {
		return this.#body.json();
	}

	bytes(): Promise<Uint8Array> {
		return this.#body.bytes();
	}

	getRawBody(): NormalizedBody {
		return this.#body.getRawBody();
	}
	//#endregion

	//#region Unused prop getters
	get type(): ResponseType {
		return "default";
	}

	get url(): string {
		return "";
	}

	get redirected(): boolean {
		return false;
	}
	//#endregion
}

function isValidStatusText(statusText: string) {
	for (let i = 0; i < statusText.length; ++i) {
		const c = statusText.charCodeAt(i);
		if (!(c === 0x09 || (c >= 0x20 && c <= 0x7e) || (c >= 0x80 && c <= 0xff))) {
			return false;
		}
	}

	return true;
}

// Make instanceof Response pass
Object.setPrototypeOf(FastResponse.prototype, Response.prototype);
