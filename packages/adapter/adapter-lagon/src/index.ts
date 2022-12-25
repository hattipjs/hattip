import type { HattipHandler } from "@hattip/core";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";

installGetSetCookie();

export default function lagonAdapter(hattipHandler: HattipHandler) {
	return function handler(request: Request) {
		return hattipHandler({
			request,
			ip: request.headers.get("X-Forwarded-For") || "",
			waitUntil() {
				// No op
			},
			passThrough() {
				// No op
			},
			platform: {},
		});
	};
}
