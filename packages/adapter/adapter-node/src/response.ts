/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { rawBodySymbol } from "./raw-body-symbol";
import { DecoratedRequest } from "./common";

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
	fetchResponse: Response,
): Promise<void> {
	if ((fetchResponse as any)[rawBodySymbol]) {
		writeHead(fetchResponse, res);
		res.end((fetchResponse as any)[rawBodySymbol]);
		return;
	}

	const { body: fetchBody } = fetchResponse;

	let body: Readable | null = null;
	if (!deno && fetchBody instanceof Readable) {
		body = fetchBody;
	} else if (fetchBody instanceof ReadableStream) {
		if (!deno && Readable.fromWeb) {
			// Available in Node.js 17+
			body = Readable.fromWeb(fetchBody as any);
		} else {
			const reader = fetchBody.getReader();
			body = new Readable({
				async read() {
					const { done, value } = await reader.read();
					this.push(done ? null : value);
				},
			});
		}
	} else if (fetchBody) {
		body = Readable.from(fetchBody as any);
	}

	writeHead(fetchResponse, res);

	if (body) {
		body.pipe(res);
		await new Promise<void>((resolve, reject) => {
			body!.once("error", reject);
			res.once("finish", resolve);
			res.once("error", () => {
				if (!res.writableEnded) {
					body.destroy();
				}
				reject();
			});
			req.once("close", () => {
				if (!res.writableEnded) {
					body.destroy();
					resolve();
				}
			});
		});
	} else {
		res.setHeader("content-length", "0");
		res.end();
	}
}

function writeHead(fetchResponse: Response, nodeResponse: ServerResponse) {
	nodeResponse.statusCode = fetchResponse.status;
	if (fetchResponse.statusText) {
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
