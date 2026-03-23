import { Body, type BodyInit, type NormalizedBody } from "./body";

export class FastRequest implements Request {
	#url: string;
	#method: string;
	#headers: Headers;
	#body: Body;
	#createSignal: () => AbortSignal;
	#signal: AbortSignal | null = null;

	/**
	 * This constructor is purposefully non-compliant to ensure better performance.
	 */
	constructor(
		url: string,
		method: string,
		headers: Headers,
		body: BodyInit,
		createSignal: () => AbortSignal,
	) {
		this.#url = url;
		this.#method = method;
		this.#headers = headers;
		this.#body = new Body(body, headers, false);
		this.#createSignal = createSignal;
	}

	get headers(): Headers {
		return this.#headers;
	}

	get method(): string {
		return this.#method;
	}

	get url(): string {
		return this.#url;
	}

	get signal(): AbortSignal {
		if (!this.#signal) {
			this.#signal = this.#createSignal();
		}

		return this.#signal;
	}

	clone(): FastRequest {
		const body = this.#body.clone();
		return new FastRequest(
			this.url,
			this.#method,
			new Headers(this.#headers),
			body.getRawBody(),
			this.#createSignal,
		);
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
	get cache() {
		return "default" as const;
	}

	get credentials() {
		return "include" as const;
	}

	get destination() {
		return "" as const;
	}

	get integrity() {
		return "" as const;
	}

	get mode() {
		return "cors" as const;
	}

	get redirect() {
		return "follow" as const;
	}

	get referrer() {
		return "" as const;
	}

	get referrerPolicy() {
		return "" as const;
	}

	get keepalive() {
		return false;
	}

	get duplex() {
		return "half" as const;
	}
	//#endregion
}

Object.setPrototypeOf(FastRequest.prototype, Request.prototype);
