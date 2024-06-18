import { Readable } from "node:stream";
import { rawBodySymbol } from "./raw-body-symbol";

const OriginalResponse = global.Response;

class Response {
	[rawBodySymbol]: any;

	status: number;

	statusText: string;

	_headers: Headers | null = null;

	constructor(body?: any, init?: any) {
		this[rawBodySymbol] = body;
		this.status = init?.status || 200;
		this.statusText = init?.statusText || "OK";
	}

	get headers() {
		if (!this._headers) {
			this._headers = new Headers();
		}

		return this._headers;
	}
}

Object.defineProperty(global, "Response", { value: Response });

type Init =
	| ReadableStream
	| Blob
	| ArrayBufferView
	| ArrayBuffer
	| FormData
	| URLSearchParams
	| string
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array
	| BigInt64Array
	| BigUint64Array
	| Buffer;
