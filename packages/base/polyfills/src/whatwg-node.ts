import * as whatwgNodeFetch from "@whatwg-node/fetch";
import { Readable } from "node:stream";

export default function install() {
	function define<S extends keyof typeof globalThis>(
		name: S,
		force = false,
		value: any = (whatwgNodeFetch as any)[name],
	) {
		if (force || !globalThis[name]) {
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

	class Response extends whatwgNodeFetch.Response {
		constructor(input: BodyInit, init?: ResponseInit) {
			if (input instanceof ReadableStream) {
				input = Readable.from(input as any) as any;
			} else if (input instanceof Uint8Array) {
				input = Buffer.from(input as any) as any;
			}

			super(input as any, init);
			(this as any).__input = input;
		}
	}

	define("Response", false, Response);
	define("Request");
	define("fetch");
}
