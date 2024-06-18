import { RequestListener, Server, createServer } from "node:http";
import { AddressInfo } from "node:net";
import { Readable, Writable, pipeline } from "node:stream";
import { test, expect, describe, beforeAll, afterAll } from "vitest";

describe.each([Response])("Response", (Response) => {
	let server: Server;
	let listener: RequestListener;
	let host: string;

	beforeAll(() => {
		return new Promise<void>((resolve) => {
			server = createServer((req, res) => {
				if (listener) {
					listener(req, res);
				} else {
					res.writeHead(404);
					res.end("Not Found");
				}
			}).listen(() => {
				const address = server.address() as AddressInfo;
				host = `http://localhost:${address.port}`;
				resolve();
			});
		});
	});

	afterAll(() => {
		return new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	});

	test("first test", async () => {
		listener = (req, res) => res.end("Hello, world!");
		const response = await fetch(host);
		const text = await response.text();
		expect(text).toBe("Hello, world!");
	});

	test.only("second test", async () => {
		listener = (req, res) => {
			req.on("data", (chunk) => {
				console.log("chunk", chunk);
			});

			req.on("end", () => {
				res.end();
			});
		};

		const { readable, writable } = new TransformStream();
		const promise = fetch(host, { method: "POST", body: readable });

		const writer = writable.getWriter();
		await writer.write("ABC");
		await writer.write("DEF");
		await writer.close();

		// const reader = readable.getReader();
		// for (;;) {
		// 	const chunk = await reader.read();
		// 	if (chunk.done) break;
		// 	console.log("chunk", chunk.value);
		// }

		const response = await promise;

		expect(response.status).toBe(200);
	});
});

async function collectReadable(readable: Readable) {
	const chunks: unknown[] = [];
	return new Promise((resolve, reject) => {
		readable.on("data", (chunk) => {
			chunks.push(chunk);
		});

		readable.on("end", () => {
			resolve(chunks);
		});

		readable.on("error", reject);
	});
}

const OldRequest = global.Request;

global.Request = class Request extends OldRequest {
	constructor(input: RequestInfo, init?: RequestInit) {
		if (init?.body instanceof ReadableStream) {
			super(input, { ...init, duplex: "half" } as any);
		} else {
			super(input, init);
		}
	}
} as any;

const oldFetch = global.fetch;
global.fetch = function fetch(input: RequestInfo, init?: RequestInit) {
	if (init?.body instanceof ReadableStream) {
		return oldFetch(input, { ...init, duplex: "half" } as any);
	} else {
		return oldFetch(input, init);
	}
} as any;
