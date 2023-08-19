/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { HattipHandler } from "@hattip/core";

export interface DenoPlatformInfo<Info extends ServerHandlerInfo> {
	name: "deno";
	info: Info;
}

interface ServerHandlerInfo {
	remoteAddr: {
		transport: "tcp" | "udp" | "unix" | "unixpacket";
		hostname?: string;
	};
}

export function createServeHandler<Info extends ServerHandlerInfo>(
	handler: HattipHandler<DenoPlatformInfo<Info>>,
) {
	return (request: Request, info: Info) => {
		return handler({
			request,
			ip: info.remoteAddr.hostname || "",
			env(variable) {
				// @ts-ignore
				return Deno.env.get(variable);
			},
			waitUntil() {
				// No op
			},
			passThrough() {
				// No op
			},
			platform: { name: "deno", info },
		});
	};
}
