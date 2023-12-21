import { Readable } from "node:stream";
import { rawBodySymbol } from "./raw-body-symbol";

const OriginalResponse = global.Response;

class Response extends OriginalResponse {
	[rawBodySymbol]: any;

	constructor(body?: any, init?: any) {
		super(body, init);
		if (
			typeof body === "string" ||
			body instanceof Uint8Array ||
			body instanceof ArrayBuffer ||
			body instanceof Readable
		) {
			this[rawBodySymbol] = body;
		}
	}
}

Object.defineProperty(global, "Response", {
	value: Response,
});
