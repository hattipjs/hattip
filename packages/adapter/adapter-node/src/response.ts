import type { ServerResponse } from "node:http";
import type { Http2ServerResponse } from "node:http2";
import { Readable } from "node:stream";

export function writeFetchResponseToNodeResponse(
	fetchResponse: Response,
	nodeResponse: ServerResponse | Http2ServerResponse,
) {
	nodeResponse.statusCode = fetchResponse.status;
	nodeResponse.statusMessage = fetchResponse.statusText;

	for (const [key, value] of fetchResponse.headers) {
		nodeResponse.appendHeader(key, value);
	}

	const body = fetchResponse.body;

	if (body) {
		Readable.fromWeb(body).pipe(nodeResponse);
	} else {
		nodeResponse.end();
	}
}
