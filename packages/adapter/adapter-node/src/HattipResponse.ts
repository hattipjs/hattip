import { PassThrough, Readable, Writable } from "node:stream";

const RAW_BODY = Symbol("rawBody");

export class HattipResponse extends Response {
	[RAW_BODY]: HattipBodyInit | null | undefined;

	constructor(body?: HattipBodyInit | null, init?: ResponseInit) {
		let parentBody = body;

		if (parentBody instanceof Readable) {
			parentBody = Readable.toWeb(parentBody) as ReadableStream<Uint8Array>;
		}

		if (isPipeable(parentBody)) {
			const passThrough = new PassThrough();
			parentBody.pipe(passThrough);
			parentBody = Readable.toWeb(passThrough) as ReadableStream<Uint8Array>;
		}

		super(parentBody, init);
		this[RAW_BODY] = body;
	}

	async arrayBuffer() {
		if (this[RAW_BODY] === undefined || this[RAW_BODY] === null) {
			return new ArrayBuffer(0);
		}

		if (this[RAW_BODY] instanceof ArrayBuffer) {
			return this[RAW_BODY];
		}

		const buffer = toBuffer(this[RAW_BODY]);

		if (buffer instanceof Promise) {
			return buffer.then((buffer) => buffer.buffer);
		}

		if (buffer) {
			return buffer.buffer;
		}

		// URLSearchParams
		// FormData
		// ReadableStream
		return super.arrayBuffer();
	}

	async json() {
		const text = await this.text();
		return JSON.parse(text);
	}

	async text() {
		if (this[RAW_BODY] === undefined || this[RAW_BODY] === null) {
			return "";
		}

		if (typeof this[RAW_BODY] === "string") {
			return this[RAW_BODY];
		}

		const buffer = toBuffer(this[RAW_BODY]);

		if (buffer instanceof Promise) {
			return buffer.then((buffer) => buffer.toString());
		}

		if (buffer) {
			return buffer.toString();
		}

		return super.text();
	}
}

function toBufferSync(body?: HattipBodyInit | null): null | Buffer {
	if (body === null || body === undefined) {
		return Buffer.alloc(0);
	}

	if (body instanceof Buffer) {
		return body;
	}

	if (typeof body === "string") {
		return Buffer.from(body);
	}

	if (body instanceof ArrayBuffer) {
		return Buffer.from(body);
	}

	if (body instanceof DataView) {
		return Buffer.from(body.buffer);
	}

	if ("BYTES_PER_ELEMENT" in body) {
		return Buffer.from(body.buffer);
	}

	// FormData
	// URLSearchParams
	// ReadableStream
	return null;
}

function toBuffer(
	body?: HattipBodyInit | null,
): null | Buffer | Promise<Buffer> {
	if (body === null || body === undefined) {
		return null;
	}

	if (body instanceof Buffer) {
		return body;
	}

	if (typeof body === "string") {
		return Buffer.from(body);
	}

	if (isPipeable(body)) {
		return collectPipeable(body);
	}

	if (body instanceof Readable) {
		return collectReadable(body);
	}

	if (body instanceof ArrayBuffer) {
		return Buffer.from(body);
	}

	if (body instanceof Blob) {
		return body.arrayBuffer().then((buffer) => Buffer.from(buffer));
	}

	if (body instanceof DataView) {
		return Buffer.from(body.buffer);
	}

	if ("BYTES_PER_ELEMENT" in body) {
		return Buffer.from(body.buffer);
	}

	// FormData
	// URLSearchParams
	// ReadableStream
	return null;
}

export function pipeResponseToWritable(
	response: HattipResponse | Response,
	writable: Writable,
) {
	if (!(RAW_BODY in response)) {
		pipeWebStreamToWritable(response.body, writable);
		return;
	}

	const body = response[RAW_BODY];

	if (body === null || body === undefined) {
		writable.end();
		return;
	}

	if (isPipeable(body)) {
		body.pipe(writable, { end: true });
		return;
	}

	if (body instanceof Readable) {
		pipeReadableToWritable(body, writable);
	}
}

function pipeWebStreamToWritable(
	body: ReadableStream<Uint8Array> | null | undefined,
	writable: Writable,
) {
	if (body) {
		Readable.fromWeb(body as any).pipe(writable, { end: true });
	} else {
		writable.end();
	}
}

function isPipeable(body?: HattipBodyInit | null): body is Pipeable {
	return typeof (body as Pipeable)?.pipe === "function";
}

async function collectReadable(readable: Readable) {
	const chunks: Buffer[] = [];
	const buffer = new Writable({
		write(chunk, encoding, callback) {
			chunks.push(chunk);
			callback();
		},
	});

	readable.pipe(buffer);

	return new Promise<Buffer>((resolve, reject) => {
		buffer.on("finish", () => {
			resolve(Buffer.concat(chunks));
		});
		buffer.on("error", reject);
	});
}

async function collectPipeable(pipeable: Pipeable) {
	const chunks: Buffer[] = [];
	const buffer = new Writable({
		write(chunk, encoding, callback) {
			chunks.push(chunk);
			callback();
		},
	});

	pipeable.pipe(buffer);

	await new Promise((resolve, reject) => {
		buffer.on("finish", resolve);
		buffer.on("error", reject);
	});

	return Buffer.concat(chunks);
}

type HattipBodyInit =
	| Blob
	| ArrayBuffer
	| TypedArray
	| DataView
	| FormData
	| URLSearchParams
	| ReadableStream<Uint8Array>
	| string
	| Buffer
	| Readable
	| Pipeable;

type TypedArray =
	| Int8Array
	| Uint8Array
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array;

type Pipeable = {
	pipe(writeable: Writable): void;
};

const cache = new Map<string, any>();

type Awaitable<T> = T | Promise<T>;

export async function getOrCreate<T>(
	key: string,
	cbCreate: () => Awaitable<T>,
): Promise<T> {
	const item = cache.get(key);

	if (item instanceof Promise) {
		const value = await item.catch(() => undefined);
		if (value !== undefined) {
			return value;
		}
	}

	if (item !== undefined) {
		return item;
	}

	// We either have an uncached value or a cached promise that failed

	// On failure this will throw synchronously
	const awaitable = cbCreate();

	if (!(awaitable instanceof Promise)) {
		cache.set(key, awaitable);
		// Item created and cached synchronously
		return awaitable;
	}

	// Put the promise in the cache to prevent duplicate creation
	cache.set(key, awaitable);

	// If the promise fails, the first caller will get the error
	const value = await awaitable;

	// All good!
	cache.set(key, value);

	return value;
}
