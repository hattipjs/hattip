export default function install() {
	// `duplex` is now required in Node's native fetch when body is a stream
	// See: https://github.com/nodejs/node/issues/46221
	class Request extends globalThis.Request {
		constructor(input: RequestInfo | URL, init?: RequestInit) {
			if (
				init &&
				init.body &&
				typeof (init.body as any)[Symbol.asyncIterator] === "function"
			) {
				(init as any).duplex = "half";
			}

			super(input, init);
		}
	}

	Object.defineProperty(globalThis, "Request", {
		value: Request,
		configurable: true,
	});
}
