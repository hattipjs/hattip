import type { OutgoingHttpHeaders, ServerResponse } from "node:http";
import type { Http2ServerResponse } from "node:http2";
import { Readable } from "node:stream";
import { FastResponse } from "@hattip/fast-request-response";

const INTERNAL_SERVER_ERROR = "Internal Server Error";

export function writeFetchResponseToNodeResponse(
	fetchResponse: Response,
	nodeResponse: ServerResponse | Http2ServerResponse,
): void {
	if (fetchResponse.type === "error") {
		return writeInternalServerError(nodeResponse);
	}

	const headers: OutgoingHttpHeaders = {};
	const setCookie: string[] = [];
	for (const [key, value] of fetchResponse.headers) {
		if (key.length === 10 && key.toLowerCase() === "set-cookie") {
			setCookie.push(value);
		} else {
			headers[key] = value;
		}
	}

	if (setCookie.length > 0) {
		headers["set-cookie"] = setCookie;
	}

	if (fetchResponse instanceof FastResponse) {
		try {
			const body = fetchResponse.getRawBody();

			if (body === null) {
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				nodeResponse.end();
			} else if (typeof body === "string") {
				headers["content-length"] ??= Buffer.byteLength(body);
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				nodeResponse.end(body);
			} else if (body instanceof Readable) {
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				body.pipe(nodeResponse);
			} else if (body instanceof ReadableStream) {
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				Readable.fromWeb(body).pipe(nodeResponse);
			} else if (body instanceof Uint8Array) {
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				nodeResponse.end(body);
			} else {
				headers["content-length"] ??= body.size;
				nodeResponse.writeHead(
					fetchResponse.status,
					fetchResponse.statusText,
					headers,
				);
				Readable.fromWeb(body.stream()).pipe(nodeResponse);
			}

			return;
		} catch (error) {
			console.error(error);
			return writeInternalServerError(nodeResponse);
		}
	}

	nodeResponse.writeHead(
		fetchResponse.status,
		fetchResponse.statusText,
		headers,
	);

	// TODO: Try to read once?

	const body = fetchResponse.body;
	if (body) {
		if (fetchResponse.bodyUsed) {
			console.error(
				new TypeError("Body is unusable: Body has already been read"),
			);
			return writeInternalServerError(nodeResponse);
		}

		Readable.fromWeb(body).pipe(nodeResponse);
	} else {
		nodeResponse.end();
	}
}

function writeInternalServerError(
	nodeResponse: ServerResponse | Http2ServerResponse,
) {
	nodeResponse.statusCode = 500;
	nodeResponse.statusMessage = INTERNAL_SERVER_ERROR;
	nodeResponse.end(INTERNAL_SERVER_ERROR);
	return;
}
