/* eslint-disable @typescript-eslint/ban-ts-comment */
import { rawBodySymbol } from "./raw-body-symbol";
import { DecoratedRequest, ServerResponse } from "./types";

// @ts-ignore
const deno = typeof Deno !== "undefined";

if (deno) {
	// Workaround for https://github.com/denoland/deno/issues/19993
	const oldSet = Headers.prototype.set;
	Headers.prototype.set = function set(key: string, value: string | string[]) {
		if (Array.isArray(value)) {
			this.delete(key);
			value.forEach((v) => this.append(key, v));
		} else {
			oldSet.call(this, key, value);
		}
	};
}

/**
 * Send a fetch API Response into a Node.js HTTP response stream.
 */
export async function sendResponse(
	req: DecoratedRequest,
	res: ServerResponse,
	fetchResponse: Response & {
		[rawBodySymbol]?: any;
	},
): Promise<void> {
	const controller = new AbortController();
	const signal = controller.signal;

	req.once("close", () => {
		controller.abort();
	});

	res.once("close", () => {
		controller.abort();
	});

	const hasContentLength = fetchResponse.headers.has("Content-Length");

	if (fetchResponse[rawBodySymbol]) {
		writeHead(fetchResponse, res, req);
		res.end(fetchResponse[rawBodySymbol]);
		return;
	}

	const body = fetchResponse.body;
	if (!body) {
		// Deno doesn't handle Content-Length automatically
		if (!hasContentLength) {
			res.setHeader("Content-Length", "0");
		}
		writeHead(fetchResponse, res, req);
		res.end();
		return;
	}

	let setImmediateFired = false;
	setImmediate(() => {
		setImmediateFired = true;
	});

	const chunks: Uint8Array[] = [];
	let bufferWritten = false;
	for await (const chunk of body) {
		if (signal.aborted) {
			body.cancel().catch(() => {});
			return;
		}
		if (setImmediateFired) {
			if (!bufferWritten) {
				writeHead(fetchResponse, res, req);
				for (const chunk of chunks) {
					await writeAndAwait(chunk, res, signal);
					if (signal.aborted) {
						body.cancel().catch(() => {});
						return;
					}
				}

				bufferWritten = true;
			}

			await writeAndAwait(chunk, res, signal);
			if (signal.aborted) {
				body.cancel().catch(() => {});
				return;
			}
		} else {
			chunks.push(chunk);
		}
	}

	if (signal.aborted) return;

	if (setImmediateFired) {
		res.end();
		return;
	}

	// We were able to read the whole body. Write at once.
	const buffer = Buffer.concat(chunks);

	// Deno doesn't handle Content-Length automatically
	if (!hasContentLength) {
		res.setHeader("Content-Length", buffer.length);
	}
	writeHead(fetchResponse, res, req);
	res.end(buffer);
}

function writeHead(
	fetchResponse: Response,
	nodeResponse: ServerResponse,
	nodeRequest: DecoratedRequest,
) {
	nodeResponse.statusCode = fetchResponse.status;
	if (nodeRequest.httpVersionMajor === 1 && fetchResponse.statusText) {
		nodeResponse.statusMessage = fetchResponse.statusText;
	}

	const uniqueHeaderNames = new Set(fetchResponse.headers.keys());

	for (const key of uniqueHeaderNames) {
		if (key === "set-cookie") {
			const setCookie = fetchResponse.headers.getSetCookie!();
			nodeResponse.setHeader("set-cookie", setCookie);
		} else {
			nodeResponse.setHeader(key, fetchResponse.headers.get(key)!);
		}
	}
}

type GenericResponse = {
	write(chunk: Uint8Array): boolean;
	once(event: "drain", listener: () => void): void;
	once(event: "error", listener: (err: unknown) => void): void;
	off(event: "drain", listener: () => void): void;
	off(event: "error", listener: (err: unknown) => void): void;
};

async function writeAndAwait(
	chunk: Uint8Array,
	res: GenericResponse,
	signal: AbortSignal,
) {
	const written = (res.write as any)(chunk);
	if (!written) {
		await new Promise<void>((resolve, reject) => {
			function cleanup() {
				res.off("drain", success);
				res.off("error", failure);
				signal.removeEventListener("abort", success);
			}

			function success() {
				cleanup();
				resolve();
			}

			function failure(reason: unknown) {
				cleanup();
				reject(reason);
			}

			res.once("drain", success);
			res.once("error", reject);
			signal.addEventListener("abort", success);
		});
	}
}
