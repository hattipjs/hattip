import type { IncomingMessage } from "node:http";
import { Http2ServerRequest } from "node:http2";

export function createFetchRequestFromNodeRequest(
	req: IncomingMessage | Http2ServerRequest,
): Request {
	// TODO: Get real origin
	const url = `http://${req.headers.host}${req.url}`;

	const headers = new Headers();
	for (const [key, value] of Object.entries(req.headers)) {
		if (typeof value === "string") {
			headers.append(key, value);
		} else if (Array.isArray(value)) {
			for (const v of value) {
				headers.append(key, v);
			}
		}
	}

	const controller = new AbortController();
	req.once("close", () => {
		controller.abort();
	});

	return new Request(url, {
		body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
		headers,
		method: req.method,
		signal: controller.signal,
		duplex: "half",
	});
}

export function getRequestOrigin(
	req: IncomingMessage | Http2ServerRequest,
	trustProxies: number,
): string {
	let protocol: "http" | "https" | undefined;
	let host: string | undefined;

	if (trustProxies > 0) {
		const forwardedHosts = splitHeaderValues(req.headers["x-forwarded-host"]);
		const forwardedProtos = splitHeaderValues(req.headers["x-forwarded-proto"]);

		const forwardedHost = forwardedHosts[forwardedHosts.length - trustProxies];
		const forwardedProto =
			forwardedProtos[forwardedProtos.length - trustProxies];

		host = forwardedHost;
		protocol =
			forwardedProto == "https"
				? "https"
				: forwardedProto === "http"
					? "http"
					: undefined;
	}

	protocol ??= (req.socket as any).encrypted ? "https" : "http";
	host ??= req.headers.host;

	return `${protocol}://${host}`;
}

function splitHeaderValues(value: string | string[] | undefined): string[] {
	if (!value || (typeof value === "string" && !value.trim())) {
		return [];
	}

	if (Array.isArray(value)) {
		return value.flatMap(splitHeaderValues);
	}

	return value.split(",").map((v) => v.trim());
}
