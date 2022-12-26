import type { HattipHandler, AdapterRequestContext } from "@hattip/core";
import { parse, splitCookiesString } from "set-cookie-parser";

type CreateTestClientArgs = {
	handler: HattipHandler;
};

type CreateTestClientReturn = {
	fetch: (
		input: URL | string | Request,
		init?: RequestInit,
	) => Promise<Response>;
	cookies: {
		set: (name: string, value: string) => void;
		get: (name: string) => string | null;
		delete: (name: string) => void;
	};
};

export function createTestClient({
	handler,
}: CreateTestClientArgs): CreateTestClientReturn {
	const internalFetch = async (
		path: string,
		init?: RequestInit,
	): Promise<Response> => {
		const method = init?.method ?? "GET";
		const request = new Request(`http://localhost${path}`, {
			...init,
			body: method === "GET" || method === "HEAD" ? undefined : init?.body,
		});
		const ctx: AdapterRequestContext = {
			request,
			ip: "",
			platform: {},
			passThrough() {
				void 0;
			},
			waitUntil(promise) {
				void promise;
			},
		};
		return await handler(ctx);
	};

	const cookies: Record<string, string> = {};
	const fetch: typeof globalThis.fetch = async (url, init) => {
		const { headers } = init ?? {};
		const requestHeaders = new Headers(headers);
		const givenCookies = requestHeaders.get("Cookie") ?? "";
		const givenCookieValues = Object.fromEntries(
			givenCookies.split("; ").map((v) => {
				const [key, value] = v.split("=");
				return [key ?? "", decodeURIComponent(value ?? "")];
			}),
		);
		const serializedCookies = Object.entries({
			...cookies,
			...givenCookieValues,
		})
			.map(([key, value]) => {
				return `${key}=${encodeURIComponent(value)}`;
			})
			.join("; ");
		if (serializedCookies) {
			requestHeaders.set("cookie", serializedCookies);
		}

		let resp: Response;
		if (typeof url === "string" && url.startsWith("/")) {
			resp = await internalFetch(url, { ...init, headers: requestHeaders });
		} else {
			resp = await globalThis.fetch(url, { ...init, headers: requestHeaders });
		}
		const responseHeaders = resp.headers;
		const setCookie = responseHeaders.get("set-cookie");
		if (setCookie) {
			const cookiesArray = splitCookiesString(setCookie);
			const parsedCookies = parse(cookiesArray);
			for (const c of parsedCookies) {
				// TODO: respect `expire`
				const { name, value, maxAge } = c;
				if (typeof maxAge === "number" && maxAge <= 0) {
					delete cookies[name];
				} else {
					cookies[name] = decodeURIComponent(value);
				}
			}
		}
		return resp;
	};
	return {
		fetch,
		cookies: {
			get(name) {
				return cookies[name] ?? null;
			},
			set(name, value) {
				cookies[name] = value;
			},
			delete(name) {
				delete cookies[name];
			},
		},
	};
}
