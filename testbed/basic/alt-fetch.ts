import { Readable } from "node:stream";
import {
	request as httpRequest,
	IncomingHttpHeaders,
	IncomingMessage,
	OutgoingHttpHeaders,
} from "node:http";
import { request as httpsRequest } from "node:https";
import { connect, IncomingHttpStatusHeader } from "node:http2";

export const httpFetch: typeof fetch = async (input, init) => {
	const request = new Request(input, init);

	const { method, headers: headersInit, body, signal } = request;

	const headers = new Headers(headersInit);
	const outgoing: OutgoingHttpHeaders = {};
	for (const [key, value] of headers.entries()) {
		const outgoingValue = outgoing[key];
		if (outgoingValue === undefined) {
			outgoing[key] = value;
		} else if (Array.isArray(outgoingValue)) {
			outgoingValue.push(value);
		} else {
			outgoing[key] = [String(outgoingValue), value];
		}
	}

	let resolve!: (value: IncomingMessage) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<IncomingMessage>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	const url = new URL(request.url);

	const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;

	const req = requestFn(
		{
			host: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			rejectUnauthorized: false,

			method,
			headers: outgoing,
		},
		resolve,
	);

	signal.addEventListener("abort", () => {
		req.destroy();
		reject(new Error("Request aborted"));
	});

	req.on("error", reject);

	if (body) {
		const readable = Readable.fromWeb(body as any);
		readable.pipe(req, { end: true });
	} else {
		req.end();
	}

	const res = await promise;

	const responseHeaders = new Headers();
	for (const [key, value] of Object.entries(res.headers)) {
		if (Array.isArray(value)) {
			for (const v of value) {
				responseHeaders.append(key, v);
			}
		} else if (value !== undefined) {
			responseHeaders.append(key, value);
		}
	}

	return new Response(res as any, {
		status: res.statusCode,
		statusText: res.statusMessage,
		headers: responseHeaders,
	});
};

export const http2Fetch: typeof fetch = async (input, init) => {
	const request = new Request(input, init);

	const { method, headers: headersInit, body, signal } = request;

	const headers = new Headers(headersInit);
	const outgoing: OutgoingHttpHeaders = {};
	for (const [key, value] of headers.entries()) {
		const outgoingValue = outgoing[key];
		if (outgoingValue === undefined) {
			outgoing[key] = value;
		} else if (Array.isArray(outgoingValue)) {
			outgoingValue.push(value);
		} else {
			outgoing[key] = [String(outgoingValue), value];
		}
	}

	let resolve!: (
		headers: IncomingHttpHeaders & IncomingHttpStatusHeader,
	) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<IncomingHttpHeaders & IncomingHttpStatusHeader>(
		(res, rej) => {
			resolve = res;
			reject = rej;
		},
	);

	const url = new URL(request.url);
	const session = connect(url.href, {
		rejectUnauthorized: false,
	});

	const req = session.request({
		":method": method,
		":path": url.pathname + url.search,
		...outgoing,
	});

	req.on("response", resolve);
	req.on("error", reject);

	signal.addEventListener("abort", () => {
		req.close();
		reject(new Error("Request aborted"));
	});

	if (body) {
		const readable = Readable.fromWeb(body as any);
		readable.pipe(req, { end: true });
	} else {
		req.end();
	}

	const resHeaders = await promise;

	const responseHeaders = new Headers();
	for (const [key, value] of Object.entries(resHeaders)) {
		if (key.startsWith(":")) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const v of value) {
				responseHeaders.append(key, v);
			}
		} else if (value !== undefined) {
			responseHeaders.append(key, value);
		}
	}

	return new Response(req as any, {
		status: resHeaders[":status"],
		headers: responseHeaders,
	});
};
