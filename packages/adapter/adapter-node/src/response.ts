/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ServerResponse } from "node:http";
import { Readable } from "node:stream";

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
	fetchResponse: Response,
	nodeResponse: ServerResponse,
): Promise<void> {
	const { body: fetchBody } = fetchResponse;

	let body: Readable | null = null;
	if (fetchBody instanceof Readable) {
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

	nodeResponse.statusCode = fetchResponse.status;
	if (fetchResponse.statusText) {
		nodeResponse.statusMessage = fetchResponse.statusText;
	}

	const uniqueHeaderNames = new Set(fetchResponse.headers.keys());

	for (const key of uniqueHeaderNames) {
		if (key === "set-cookie") {
			const setCookie = fetchResponse.headers.getSetCookie();
			if (nodeResponse.appendHeader) {
				for (const cookie of setCookie) {
					nodeResponse.appendHeader("set-cookie", cookie);
				}
			} else {
				// Workaround for https://github.com/denoland/deno/issues/19993
				nodeResponse.setHeader("set-cookie", setCookie);
			}
		} else {
			nodeResponse.setHeader(key, fetchResponse.headers.get(key)!);
		}
	}

	if (body) {
		body.pipe(nodeResponse, { end: true });
		await new Promise<void>((resolve, reject) => {
			nodeResponse.once("error", reject);
			nodeResponse.once("finish", resolve);
		});
	} else {
		nodeResponse.setHeader("content-length", "0");
		nodeResponse.end();
	}
}
