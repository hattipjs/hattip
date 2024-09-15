import type { HattipHandler } from "@hattip/core";

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
			platform: { name: "lagon" },
			env(variable) {
				return (globalThis as any).process.env[variable];
			},
		});
	};
}
