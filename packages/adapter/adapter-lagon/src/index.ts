import type { HattipHandler } from "@hattip/core";
import process from "node:process";

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
				return process.env[variable];
			},
		});
	};
}
