import * as nodeFetch from "node-fetch-native";
import { Readable } from "stream";

export default function install() {
	function define<S extends keyof typeof globalThis>(name: S) {
		if (!globalThis[name]) {
			Object.defineProperty(globalThis, name, {
				value: (nodeFetch as any)[name],
				writable: false,
				configurable: true,
			});
		}
	}

	define("fetch");
	define("AbortController");
	define("Blob");
	define("File");
	define("FormData");
	define("Headers");
	define("Request");

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

	globalThis.Response = Response as any;
}
