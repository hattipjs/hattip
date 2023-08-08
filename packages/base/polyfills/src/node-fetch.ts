import * as nodeFetch from "node-fetch-native";
import { Readable } from "node:stream";
import installHalfDuplexRequest from "./half-duplex-request";

export default function install() {
	function define<S extends keyof typeof globalThis>(
		name: S,
		value: any = (nodeFetch as any)[name],
	) {
		if (!globalThis[name]) {
			Object.defineProperty(globalThis, name, {
				value,
				configurable: true,
			});
		}
	}

	define("AbortController");
	define("Blob");
	define("File");
	define("FormData");
	define("Headers");

	if (globalThis.Response) return;

	// node-fetch doesn't allow constructing a Response or a Request from ReadableStream
	// see: https://github.com/node-fetch/node-fetch/issues/1096
	class Response extends nodeFetch.Response {
		constructor(input: BodyInit, init?: ResponseInit) {
			if (input instanceof ReadableStream) {
				input = Readable.from(input as any) as any;
			}

			super(input as any, init);
		}
	}

	class Request extends nodeFetch.Request {
		constructor(input: RequestInfo | URL, init?: RequestInit) {
			if (init?.body instanceof ReadableStream) {
				const body = Readable.from(init.body as any);
				init = new Proxy(init, {
					get(target, prop) {
						if (prop === "body") {
							return body;
						}

						return target[prop as keyof RequestInit];
					},
				});
			}

			super(input, init);
		}
	}

	Object.defineProperty(Response, "name", {
		value: "Response",
		writable: false,
	});

	Object.defineProperty(Request, "name", {
		value: "Request",
		writable: false,
	});

	define("Response", Response);
	if (globalThis.Request) {
		installHalfDuplexRequest();
	} else {
		define("Request", Request);
	}

	define("fetch", (input: any, init: any) =>
		nodeFetch.default(input, init).then((r) => {
			Object.setPrototypeOf(r, Response.prototype);
			return r;
		}),
	);
}
