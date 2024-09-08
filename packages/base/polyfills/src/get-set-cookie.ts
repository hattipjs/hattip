import type {} from "@hattip/core";

declare global {
	interface Headers {
		raw?(): Record<string, string | string[]>;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore: Deno isn't happy with this one
		getAll?(name: string): string[];
	}
}

export default function install() {
	if (typeof globalThis.Headers.prototype.getSetCookie === "function") {
		return;
	}

	if (typeof globalThis.Headers.prototype.getAll === "function") {
		globalThis.Headers.prototype.getSetCookie = function getSetCookie() {
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
		return [...this]
			.filter(([key]) => key.toLowerCase() === "set-cookie")
			.map(([, value]) => value);
	};
}
