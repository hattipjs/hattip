import type {} from "@hattip/core";

const SET_COOKIE = Symbol("set-cookie");

declare global {
	interface Headers {
		[SET_COOKIE]?: string[];
		raw?(): Record<string, string | string[]>;
		getAll?(name: string): string[];
	}
}

export default function install() {
	if (typeof globalThis.Headers.prototype.getSetCookie === "function") {
		return;
	}

	if (typeof globalThis.Headers.prototype.getAll === "function") {
		globalThis.Headers.prototype.getSetCookie = function () {
			return this.getAll!("Set-Cookie");
		};

		return;
	}

	if (typeof globalThis.Headers.prototype.raw === "function") {
		globalThis.Headers.prototype.getSetCookie = function () {
			const setCookie = this.raw!()["set-cookie"];
			if (!setCookie) {
				return [];
			} else if (typeof setCookie === "string") {
				return [setCookie];
			}

			return setCookie;
		};

		return;
	}

	globalThis.Headers.prototype.getSetCookie = function getSetCookie() {
		return this[SET_COOKIE] || [];
	};

	const originalAppend = globalThis.Headers.prototype.append;
	globalThis.Headers.prototype.append = function append(
		name: string,
		value: string,
	) {
		if (name.toLowerCase() === "set-cookie") {
			if (!this[SET_COOKIE]) {
				this[SET_COOKIE] = [];
			}

			this[SET_COOKIE].push(value);
		}

		return originalAppend.call(this, name, value);
	};

	const originalDelete = globalThis.Headers.prototype.delete;
	globalThis.Headers.prototype.delete = function deleteHeader(name: string) {
		if (name.toLowerCase() === "set-cookie") {
			this[SET_COOKIE] = [];
		}

		return originalDelete.call(this, name);
	};

	const originalSet = globalThis.Headers.prototype.set;
	globalThis.Headers.prototype.set = function setHeader(
		name: string,
		value: string,
	) {
		if (name.toLowerCase() === "set-cookie") {
			this[SET_COOKIE] = [value];
		}

		return originalSet.call(this, name, value);
	};

	const Headers = class MyHeaders extends globalThis.Headers {
		constructor(init?: HeadersInit) {
			super(init);
			if (!init) {
				return;
			}
			if (init instanceof MyHeaders || init instanceof MyHeaders) {
				this[SET_COOKIE] = init[SET_COOKIE];
			} else if (Array.isArray(init)) {
				this[SET_COOKIE] = init
					.filter(([key]) => key.toLowerCase() === "set-cookie")
					.map(([, value]) => value);
			} else {
				this[SET_COOKIE] = [];
				for (const [key, value] of Object.entries(init)) {
					if (key.toLowerCase() === "set-cookie") {
						if (typeof value === "string") {
							this[SET_COOKIE]!.push(value);
						} else if (Array.isArray(value)) {
							this[SET_COOKIE]!.push(...(value as string[]));
						}
					}
				}
			}
		}
	};

	const Response = class extends globalThis.Response {
		constructor(body: any, init?: ResponseInit) {
			super(body, init);

			const headers = new Headers(init?.headers);

			Object.defineProperty(this, "headers", {
				value: headers,
				writable: false,
			});
		}
	};

	Object.defineProperty(Response, "name", {
		value: "Response",
		writable: false,
	});

	const originalFetch = globalThis.fetch;
	Object.defineProperty(globalThis, "Headers", { value: Headers });
	Object.defineProperty(globalThis, "Response", { value: Response });
	Object.defineProperty(globalThis, "fetch", {
		value: (input: any, init?: any) =>
			originalFetch(input, init).then((r) => {
				Object.setPrototypeOf(r, Response.prototype);
				const headers = new Headers(r.headers);
				Object.defineProperty(r, "headers", {
					value: headers,
					writable: false,
				});
				return r;
			}),
	});
}
