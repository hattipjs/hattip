import { Readable } from "node:stream";

declare const r: Readable;

export class HattipFastRequest extends Request {
	#stream?: Readable;

	constructor(input: RequestInfo | URL, init?: RequestInit) {
		const body = init?.body;
		const isReadable = body instanceof Readable;

		super(
			input,
			isReadable || body instanceof ReadableStream
				? ({ ...init, duplex: "half" } as any)
				: init,
		);

		if (isReadable) {
			this.#stream = body;
		}
	}

	async arrayBuffer() {
		if (!this.#stream) {
			return super.arrayBuffer();
		}

		const buffer = await collectReadable(this.#stream);
		return buffer.buffer;
	}

	async blob() {
		if (!this.#stream) {
			return super.blob();
		}

		return new Blob([await collectReadable(this.#stream)]);
	}

	async json() {
		if (!this.#stream) {
			return super.json();
		}

		const text = await this.text();
		return JSON.parse(text);
	}

	async text() {
		if (!this.#stream) {
			return super.text();
		}

		const buffer = await collectReadable(this.#stream);
		return buffer.toString("utf-8");
	}
}

async function collectReadable(readable: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	return new Promise<Buffer>((resolve, reject) => {
		readable.on("data", (chunk) => {
			chunks.push(chunk);
		});

		readable.on("end", () => {
			resolve(Buffer.concat(chunks));
		});

		readable.on("error", reject);
	});
}
