import * as nodeFetch from "node-fetch-native";
import { Readable } from "stream";
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

	if (globalThis.Request) {
		installHalfDuplexRequest();
	} else {
		define("Request");
	}

	if (globalThis.Response) return;

	// node-fetch doesn't allow constructing a Request from ReadableStream
	// see: https://github.com/node-fetch/node-fetch/issues/1096
	class Response extends nodeFetch.Response {
		constructor(input: BodyInit, init?: ResponseInit) {
			if (input instanceof ReadableStream) {
				input = Readable.from(input as any) as any;
			}

			super(input as any, init);
		}
	}

	Object.defineProperty(Response, "name", {
		value: "Response",
		writable: false,
	});

	define("Response", Response);
	define("fetch", (input: any, init: any) =>
		nodeFetch.default(input, init).then((r) => {
			Object.setPrototypeOf(r, Response.prototype);
			return r;
		}),
	);
}
