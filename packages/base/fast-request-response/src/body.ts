import { PassThrough, Readable, Writable } from "node:stream";
import consumers from "node:stream/consumers";

export type BodyInit =
	| null
	| string
	| ArrayBuffer
	| Blob
	| FormData
	| NodeJS.ArrayBufferView
	| URLSearchParams
	| AsyncIterable<Uint8Array>
	// This is defined in the types but doesn't actually work
	| Iterable<Uint8Array>;

export type NormalizedBody =
	| null
	| string
	| Uint8Array<ArrayBuffer>
	| Blob
	| ReadableStream<Uint8Array>
	| Readable;

export function normalizeBody(
	init: BodyInit,
	headers: Headers,
	cloneBuffers = true,
): NormalizedBody {
	let result: NormalizedBody;
	let defaultType: string | null = null;

	if (
		init === null ||
		init instanceof Readable ||
		init instanceof ReadableStream
	) {
		result = init;
	} else if (init instanceof ArrayBuffer) {
		if (cloneBuffers) {
			const src = new Uint8Array(init);
			result = new Uint8Array(init.byteLength);
			result.set(src);
		} else {
			result = new Uint8Array(init);
		}
	} else if (ArrayBuffer.isView(init)) {
		if (cloneBuffers || !(init.buffer instanceof ArrayBuffer)) {
			// Copy to separate buffer
			const src =
				init instanceof Uint8Array
					? init
					: new Uint8Array(init.buffer, init.byteOffset, init.byteLength);
			result = new Uint8Array(src.byteLength);
			result.set(src);
		} else if (init instanceof Uint8Array && !(init instanceof Buffer)) {
			// Use as is
			result = init as Uint8Array<ArrayBuffer>; // Guaranteed to be backed by ArrayBuffer
		} else {
			result = new Uint8Array(init.buffer, init.byteOffset, init.byteLength);
		}
	} else if (init instanceof URLSearchParams) {
		result = init.toString();
		defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
	} else if (init instanceof Blob) {
		// Since Blob is immutable, we can delay its cloning until blob() is called
		result = init;
		defaultType = init.type;
	} else if (init instanceof FormData) {
		// This is not efficient but FormData responses should be pretty rare anyway
		const type = headers.get("content-type");
		const cloneHeaders = type ? { "content-type": type } : undefined;
		const response = new Response(init, { headers: cloneHeaders });
		result = response.body;
		defaultType = response.headers.get("content-type");
	} else if (
		(typeof init === "object" || typeof init === "function") &&
		Symbol.asyncIterator in init
	) {
		result = Readable.from(init);
	} else {
		result = String(init);
		defaultType = "text/plain;charset=UTF-8";
	}

	if (defaultType !== null && !headers.has("content-type")) {
		headers.set("content-type", defaultType);
	}

	return result;
}

const USED_BODY = Symbol("USED_BODY");

export class Body {
	#normalizedBody: NormalizedBody | typeof USED_BODY;
	#headers: Headers;
	#separateBuffer: boolean;

	constructor(
		init: BodyInit = null,
		headers: Headers,
		separateBuffer: boolean,
	) {
		let body: NormalizedBody;
		let defaultType: string | null = null;

		if (
			init === null ||
			init instanceof Readable ||
			init instanceof ReadableStream
		) {
			body = init;
		} else if (init instanceof ArrayBuffer) {
			if (separateBuffer) {
				const src = new Uint8Array(init);
				body = new Uint8Array(init.byteLength);
				body.set(src);
			} else {
				body = new Uint8Array(init);
			}
		} else if (ArrayBuffer.isView(init)) {
			if (separateBuffer || !(init.buffer instanceof ArrayBuffer)) {
				// Copy to separate buffer
				const src =
					init instanceof Uint8Array
						? init
						: new Uint8Array(init.buffer, init.byteOffset, init.byteLength);
				body = new Uint8Array(src.byteLength);
				body.set(src);
			} else if (init instanceof Uint8Array && !(init instanceof Buffer)) {
				// Use as is
				body = init as Uint8Array<ArrayBuffer>; // Guaranteed to be backed by ArrayBuffer
			} else {
				// Buffer instances are subtly incompatible
				body = new Uint8Array(init.buffer, init.byteOffset, init.byteLength);
			}
		} else if (init instanceof URLSearchParams) {
			body = init.toString();
			defaultType = "application/x-www-form-urlencoded;charset=UTF-8";
		} else if (init instanceof Blob) {
			// Since Blob is immutable, we can delay its cloning
			body = init;
			defaultType = init.type;
		} else if (init instanceof FormData) {
			// This is not efficient but FormData responses should be pretty rare anyway
			const response = new Response(init, { headers });
			body = response.body;
			defaultType = response.headers.get("content-type");
		} else if (
			(typeof init === "object" || typeof init === "function") &&
			Symbol.asyncIterator in init
		) {
			body = Readable.from(init);
		} else {
			body = String(init);
			defaultType = "text/plain;charset=UTF-8";
		}

		if (defaultType !== null && !headers.has("content-type")) {
			headers.set("content-type", defaultType);
		}

		this.#normalizedBody = body;
		this.#headers = headers;
		this.#separateBuffer = separateBuffer;
	}

	clone(): Body {
		const body = this.#normalizedBody;

		if (body === null) {
			return new Body(null, this.#headers, this.#separateBuffer);
		}

		Body.#assertUsableBody(body);

		if (body instanceof Readable || body instanceof ReadableStream) {
			const stream = getActiveStream(body);

			if (stream instanceof Readable) {
				const [a, b] = teeReadable(stream);

				this.#normalizedBody = a;

				return new Body(b, this.#headers, this.#separateBuffer);
			}

			if (stream instanceof ReadableStream) {
				const [a, b] = stream.tee();

				this.#normalizedBody = a;

				return new Body(b, this.#headers, this.#separateBuffer);
			}
		}

		return new Body(body, this.#headers, this.#separateBuffer);
	}

	static #isBodyUsable(
		body: Exclude<NormalizedBody, null> | typeof USED_BODY,
	): body is Exclude<NormalizedBody, null> {
		if (body === USED_BODY) {
			return false;
		}

		if (body instanceof Readable || body instanceof ReadableStream) {
			// Passing a web stream actually works on Node and used in undici (Node's native
			// implementation). It doesn't work on Deno and Bun but it looks like it's the best
			// we can do.
			return !Readable.isDisturbed(getActiveStream(body) as any);
		}

		// "Solid body" responses that haven't been used
		return true;
	}

	static #assertUsableBody(
		body: NormalizedBody | typeof USED_BODY,
	): asserts body is NormalizedBody {
		if (!Body.#isBodyUsable(body!)) {
			throw new TypeError("Body is unusable: Body has already been read");
		}
	}

	get bodyUsed(): boolean {
		const body = this.#normalizedBody;
		if (body === null) {
			// null bodies are never considered used
			return false;
		}

		return !Body.#isBodyUsable(body);
	}

	get body(): ReadableStream<Uint8Array> | null {
		const body = this.#normalizedBody;

		if (body === null) {
			return null;
		}

		if (body instanceof ReadableStream) {
			return body;
		}

		// Body is not a readable stream. We'll replace it with one.

		let stream: ReadableStream<Uint8Array>;

		if (body instanceof Readable) {
			stream = getOrCreateWebStreamFromNodeStream(body);
		} else if (body === USED_BODY) {
			// Create a closed stream
			stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.close();
				},
			});

			stream.cancel().catch(() => {});
		} else if (body instanceof Blob) {
			stream = body.stream();
		} else if (typeof body === "string") {
			stream = ReadableStream.from([Buffer.from(body)]);
			// stream = new ReadableStream<Uint8Array>({
			// 	start(controller) {
			// 		controller.enqueue(Buffer.from(body));
			// 		controller.close();
			// 	},
			// });
		} else {
			// body instanceof Uint8Array
			stream = ReadableStream.from([body]);

			// stream = new ReadableStream<Uint8Array>({
			// 	start(controller) {
			// 		controller.enqueue(body);
			// 		controller.close();
			// 	},
			// });
		}

		this.#normalizedBody = stream;

		return this.#normalizedBody;
	}

	async arrayBuffer(): Promise<ArrayBuffer> {
		const body = this.#normalizedBody;

		if (body === null) {
			return new ArrayBuffer(0);
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return consumers.arrayBuffer(getActiveStream(body));
		}

		// For non-streaming bodies, mark the body as used
		this.#normalizedBody = USED_BODY;

		if (typeof body === "string") {
			// Buffer.from(string) always allocates a new ArrayBuffer on Node 20+,
			// but it may be a slice of the internal pool
			const nodeBuffer = Buffer.from(body);
			if (
				nodeBuffer.byteOffset === 0 &&
				nodeBuffer.byteLength === nodeBuffer.buffer.byteLength
			) {
				// We have the whole buffer to ourselves
				return nodeBuffer.buffer;
			} else {
				// Copy pooled buffer
				const bytes = new Uint8Array(nodeBuffer);
				return bytes.buffer;
			}
		}

		if (body instanceof Uint8Array) {
			if (body.byteOffset === 0 && body.byteLength === body.buffer.byteLength) {
				// We have the whole buffer to ourselves
				return body.buffer;
			} else {
				// Shared buffer, make a copy
				const bytes = new Uint8Array(body);
				return bytes.buffer;
			}
		}

		// body is Blob
		return body.arrayBuffer();
	}

	async blob(): Promise<Blob> {
		const type = this.#headers.get("content-type") ?? undefined;

		const body = this.#normalizedBody;

		if (body === null) {
			return new Blob([], { type });
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return consumers.blob(getActiveStream(body));
		}

		// For non-streaming bodies, mark the body as used
		this.#normalizedBody = USED_BODY;

		if (body instanceof Blob) {
			if (this.#separateBuffer) {
				return body.slice(undefined, undefined, body.type);
			} else {
				return body;
			}
		}

		// string or Uint8Array
		return new Blob([body], { type });
	}

	#makeFormData(body: NormalizedBody): Promise<FormData> {
		// This is inefficient but FormData responses should be rare anyway
		return new Response(body, {
			headers: this.#headers,
			// eslint-disable-next-line @typescript-eslint/no-deprecated
		}).formData();
	}

	async formData(): Promise<FormData> {
		const body = this.#normalizedBody;

		if (body === null) {
			return this.#makeFormData(body);
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return this.#makeFormData(getActiveStream(body));
		}

		// For non-streaming bodies, mark the body as used
		this.#normalizedBody = USED_BODY;

		return this.#makeFormData(body);
	}

	async text(): Promise<string> {
		const body = this.#normalizedBody;

		if (body === null) {
			return "";
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return text(getActiveStream(body));
		}

		// For non-streaming bodies, mark the body as used
		this.#normalizedBody = USED_BODY;

		if (typeof body === "string") {
			let bomless = body;
			// Skip BOM
			if (bomless.codePointAt(0) === 0xfeff) {
				bomless = bomless.slice(1);
			}

			return bomless;
		}

		if (body instanceof Uint8Array) {
			let bomless = body;
			if (bomless[0] === 239 && bomless[1] === 187 && bomless[2] === 191) {
				bomless = bomless.subarray(3);
			}
			return Buffer.from(bomless).toString();
		}

		// body is Blob
		return body.text();
	}

	async json(): Promise<unknown> {
		return this.text().then((text) => JSON.parse(text));
	}

	async bytes(): Promise<Uint8Array> {
		const body = this.#normalizedBody;

		if (body === null) {
			return new Uint8Array();
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return bytes(getActiveStream(body));
		}

		// For non-streaming bodies, mark the body as used
		this.#normalizedBody = USED_BODY;

		if (typeof body === "string") {
			// Buffer.from(string) creates a fresh allocation; the returned Uint8Array
			// view holds a reference to it, preventing pool reuse.
			const nodeBuffer = Buffer.from(body);
			return new Uint8Array(
				nodeBuffer.buffer,
				nodeBuffer.byteOffset,
				nodeBuffer.byteLength,
			);
		}

		if (body instanceof Uint8Array) {
			return body;
		}

		// body is Blob
		return body.bytes();
	}

	getRawBody(): NormalizedBody {
		const body = this.#normalizedBody;
		this.#normalizedBody = USED_BODY;

		if (body === null) {
			return null;
		}

		Body.#assertUsableBody(body);

		return body;
	}

	consumeAsStream(): Readable | ReadableStream<Uint8Array> | null {
		const body = this.#normalizedBody;
		this.#normalizedBody = USED_BODY;

		if (body === null) {
			return new Readable().destroy();
		}

		Body.#assertUsableBody(body);

		if (body instanceof ReadableStream || body instanceof Readable) {
			return body;
		}

		// Convert to stream

		if (body instanceof Blob) {
			return body.stream();
		}

		return Readable.from([body]);
	}

	pipeToNodeWriteable(writeable: Writable, end = true) {
		const body = this.getRawBody();

		if (body === null) {
			if (end) {
				writeable.end();
			}
		} else if (typeof body === "string") {
			if (end) {
				writeable.end(body);
			} else {
				writeable.write(body);
			}
		} else if (body instanceof Readable) {
			body.pipe(writeable, { end });
		} else if (body instanceof ReadableStream) {
			Readable.fromWeb(body).pipe(writeable, { end });
		} else if (body instanceof Uint8Array) {
			if (end) {
				writeable.end(body);
			} else {
				writeable.write(body);
			}
		}
	}
}

// When a web stream is created from a Node stream,
// we cache it and try to use it exclusively instead
// of the underlying Node stream because Readable.fromWeb
// actually tees the source stream, causing risk of excessive
// buffering. This also ensures that two responses/requests created
// from the same Node stream act similarly to two responses/requests
// created from the same web stream: r1.body === r2.body unless one
// of them was cloned. This is different than the native Node behavior.
const cache = new WeakMap<Readable, ReadableStream>();

// We cache it when a web stream is created from a Node stream
function getOrCreateWebStreamFromNodeStream(
	nodeStream: Readable,
): ReadableStream {
	const cached = cache.get(nodeStream);
	if (cached) {
		return cached;
	} else {
		const stream = Readable.toWeb(nodeStream);
		cache.set(nodeStream, stream);
		return stream;
	}
}

// When given a Node stream that was converted into a web stream,
// returns the web stream. Otherwise returns the source.
function getActiveStream(source: Readable | ReadableStream) {
	if (source instanceof ReadableStream) {
		return source;
	}

	const cached = cache.get(source);
	return cached ?? source;
}

/**
 * Tee a Node Readable into two PassThrough streams, matching web streams tee()
 * semantics: the source runs at the faster consumer's pace, and the slower
 * consumer buffers internally without limit or backpressure.
 */
function teeReadable(source: Readable): [PassThrough, PassThrough] {
	const a = new PassThrough();
	const b = new PassThrough();
	let aEnded = false;
	let bEnded = false;

	source.on("data", (chunk) => {
		const aOk = a.destroyed || a.write(chunk);
		const bOk = b.destroyed || b.write(chunk);
		if (a.destroyed && b.destroyed) {
			source.destroy();
			return;
		}
		// Backpressure only when BOTH are full (faster consumer drives pace)
		// This matches the readableStream.tee()'s (unfortunate) behavior.
		if (!aOk && !bOk) {
			source.pause();
		}
	});

	// Resume when either drains (the faster one)
	a.on("drain", () => {
		if (!source.destroyed) source.resume();
	});
	b.on("drain", () => {
		if (!source.destroyed) source.resume();
	});

	source.on("end", () => {
		a.end();
		b.end();
	});
	source.on("error", (err) => {
		a.destroy(err);
		b.destroy(err);
	});

	const maybeDestroySource = () => {
		if (aEnded && bEnded) source.destroy();
	};

	a.on("close", () => {
		aEnded = true;
		maybeDestroySource();
	});
	b.on("close", () => {
		bEnded = true;
		maybeDestroySource();
	});

	return [a, b];
}

const bytes: (
	stream: ReadableStream<any> | NodeJS.ReadableStream | AsyncIterable<any>,
) => Promise<Uint8Array> =
	// `bytes` is not available in Node < 24.
	// The following line will cause an error when we upgrade the types as a reminder to
	// start using bytes directly.
	// @ts-expect-error: In Node 24 already? Start using bytes directly!
	consumers.bytes ??
	((stream: AsyncIterable<Uint8Array>) =>
		consumers.arrayBuffer(stream).then((buffer) => new Uint8Array(buffer)));

// TODO: Benchmark various implementations
async function text(stream: AsyncIterable<Uint8Array>) {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	// TODO: Skip BOM
	return Buffer.concat(chunks).toString();
}
