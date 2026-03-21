import { Readable } from "node:stream";
import { FastResponse } from "@hattip/fast-request-response";
import type { HttpResponse } from "uWebSockets.js";
import { STATUS_CODES } from "node:http";

const INTERNAL_SERVER_ERROR = "500 Internal Server Error";

export function writeFetchResponseToUwsResponse(
	fetchResponse: Response,
	uwsResponse: HttpResponse,
) {
	if (fetchResponse.type === "error") {
		return writeInternalServerError(uwsResponse);
	}

	let statusLine = `${fetchResponse.status}`;
	const statusText =
		fetchResponse.statusText || STATUS_CODES[fetchResponse.status];
	if (statusText) {
		statusLine += " " + statusText;
	}

	uwsResponse.writeStatus(statusLine);
	uwsResponse.statusMessage = fetchResponse.statusText;

	if (fetchResponse instanceof FastResponse) {
		try {
			const body = fetchResponse.getRawBody();

			if (body instanceof Blob) {
				if (!fetchResponse.headers.has("content-length")) {
					fetchResponse.headers.set("content-length", `${body.size}`);
				}
			}

			for (const [key, value] of fetchResponse.headers) {
				uwsResponse.writeHeader(key, value);
			}

			if (body === null) {
				uwsResponse.end();
			} else if (typeof body === "string") {
				uwsResponse.end(body);
			} else if (body instanceof Uint8Array) {
				uwsResponse.end(body);
			} else if (body instanceof Readable) {
				pipeReadableToUwsResponse(body, uwsResponse);
			} else if (body instanceof ReadableStream) {
				pipeReadableToUwsResponse(Readable.from(body), uwsResponse);
			} else {
				pipeReadableToUwsResponse(Readable.from(body.stream()), uwsResponse);
			}

			return;
		} catch (error) {
			console.error(error);
			return writeInternalServerError(uwsResponse);
		}
	}

	const body = fetchResponse.body;
	if (body) {
		if (fetchResponse.bodyUsed) {
			console.error(
				new TypeError("Body is unusable: Body has already been read"),
			);
			return writeInternalServerError(uwsResponse);
		}

		for (const [key, value] of fetchResponse.headers) {
			uwsResponse.writeHeader(key, value);
		}

		pipeReadableToUwsResponse(Readable.fromWeb(body), uwsResponse);
	} else {
		uwsResponse.end();
	}
}

function writeInternalServerError(uwsResponse: HttpResponse) {
	uwsResponse.writeStatus(INTERNAL_SERVER_ERROR);
	uwsResponse.end(INTERNAL_SERVER_ERROR);
	return;
}

function pipeReadableToUwsResponse(readable: Readable, response: HttpResponse) {
	readable.on("data", (chunk) => {
		response.cork(() => {
			response.write(chunk);
		});
	});

	readable.once("close", () => {
		response.cork(() => {
			response.end();
		});
	});
}
