import { createConnection, type Socket } from "node:net";
import { StringDecoder } from "node:string_decoder";

export interface ParsedResponse {
	status: number;
	headers: Headers;
	body: any;
}

export function sendRawRequest(
	host: string,
	port: number,
	method: string,
	url: string,
	hostHeader: string,
): Promise<ParsedResponse> {
	let resolve: (value: ParsedResponse) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<ParsedResponse>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	try {
		const socket = createConnection(
			{
				host,
				port,
				keepAlive: false,
			},
			() => {
				const raw = [
					`${method} ${url} HTTP/1.1`,
					`Host: ${hostHeader}`,
					`Content-Length: 0`,
					"",
					"",
				].join("\r\n");

				parseResponse(socket).then(resolve, reject);

				socket.write(raw);
			},
		);

		socket.on("error", reject!);
	} catch (error) {
		reject!(error);
	}

	return promise;
}

function parseResponse(socket: Socket): Promise<ParsedResponse> {
	const decoder = new StringDecoder();
	let leftover = "";
	let phase: "status-line" | "headers" | "body" = "status-line";
	let status = 0;
	const headers = new Headers();
	let body = "";

	function onLine(line: string) {
		switch (phase) {
			case "status-line":
				status = parseInt(line.split(" ")[1]!, 10);
				if (Number.isNaN(status)) {
					console.warn(`Failed to parse status code from status line: ${line}`);
					status = 0;
				}
				socket.end();
				phase = "headers";
				break;
			case "headers":
				if (line) {
					const [key, value] = line.split(": ");
					if (key && value) {
						headers.append(key.trim(), value.trim());
					} else {
						console.warn(`Failed to parse header line: ${line}`);
					}
				} else {
					phase = "body";
				}
				break;
			case "body":
				body += line + "\r\n";
				break;
		}
	}

	function onData(data: Buffer): void {
		leftover += decoder.write(data);
		let index: number;
		while ((index = leftover.indexOf("\r\n")) >= 0) {
			const line = leftover.slice(0, index);
			onLine(line);
			leftover = leftover.slice(index + 2);
		}
	}

	return new Promise((resolve, reject) => {
		function onError(error: unknown): void {
			socket.destroy();
			reject(error);
		}

		socket.on("data", onData);

		socket.on("error", onError);

		socket.once("end", () => {
			socket.off("data", onData);
			socket.off("error", onError);
			socket.end();
			onLine(leftover);
			try {
				body = JSON.parse(body);
			} catch {
				// Ignore JSON parsing errors
			}

			resolve({ status, headers, body });
		});
	});
}
