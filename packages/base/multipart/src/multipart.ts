import {
	defaultCreateLimitError,
	DEFAULT_MAX_HEADER_COUNT,
	DEFAULT_MAX_HEADER_SIZE,
	DEFAULT_MAX_PARTS,
	DEFAULT_MAX_TOTAL_HEADER_SIZE,
} from "./limits";
import { split } from "./split";
import { MultipartPart, SimpleHeaders } from "./types";

export interface MultipartParserOptions {
	/** Boundary text */
	boundaryText: string;
	/** Create the error to throw when a limit is exceeded */
	createLimitError?(name: string, value: number, limit: number): Error;
	/** The maximum number of headers @default 16 */
	maxHeaderCount?: number;
	/** The maximum size of a header in bytes @default 1024 */
	maxHeaderSize?: number;
	/** The maximum combined size of all headers in bytes @default 4096 (4K) */
	maxTotalHeaderSize?: number;
	/** The maximum number of parts @default 1024 */
	maxParts?: number;
}

type CompleteMultipartParserOptions = Required<MultipartParserOptions>;

export async function* parseMultipart(
	input: ReadableStream<Uint8Array>,
	options: MultipartParserOptions,
): AsyncIterableIterator<MultipartPart> {
	const completeOptions: CompleteMultipartParserOptions = {
		...options,
		createLimitError: options.createLimitError ?? defaultCreateLimitError,
		maxHeaderCount: options.maxHeaderCount ?? DEFAULT_MAX_HEADER_COUNT,
		maxHeaderSize: options.maxHeaderSize ?? DEFAULT_MAX_HEADER_SIZE,
		maxTotalHeaderSize:
			options.maxTotalHeaderSize ?? DEFAULT_MAX_TOTAL_HEADER_SIZE,
		maxParts: options.maxParts ?? DEFAULT_MAX_PARTS,
	};

	const stream = parsePartHeaders(input, completeOptions);
	let nextHeaders: SimpleHeaders | undefined;
	const reader = stream.getReader();

	function body(): ReadableStream<Uint8Array> {
		return new ReadableStream({
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) {
						controller.close();
						return;
					}

					if (value instanceof Map) {
						nextHeaders = value;
						controller.close();
						return;
					}

					controller.enqueue(value);
				} catch (error) {
					controller.error(error);
				}
			},
		});
	}

	for (;;) {
		let next: ReadableStreamReadResult<SimpleHeaders | Uint8Array>;

		if (nextHeaders) {
			next = { value: nextHeaders, done: false };
			nextHeaders = undefined;
		} else {
			next = await reader.read();
		}

		while (!next.done && !(next.value instanceof Map)) {
			next = await reader.read();
		}

		if (next.done) {
			break;
		}

		const part: MultipartPart = {
			headers: next.value as SimpleHeaders,
			body: body(),
		};

		yield part;

		// Drain the body
		try {
			const reader = await part.body.getReader();
			for (;;) {
				const { done } = await reader.read();
				if (done) {
					break;
				}
			}
		} catch {
			// Ignore errors
		}
	}
}

export function parsePartHeaders(
	input: ReadableStream<Uint8Array>,
	options: CompleteMultipartParserOptions,
): ReadableStream<SimpleHeaders | Uint8Array> {
	let totalParts = 0;
	let totalHeaderSize = 0;

	let state: "header" | "body" = "header";
	let crLfState: "none" | "cr" | "cr-lf" | "cr-lf-cr" = "none";

	let headers: SimpleHeaders = new Map();
	let headerCount = 0;
	const lastHeader = new Uint8Array(options.maxHeaderSize);
	let lastHeaderOffset = 0;

	const stack: Uint8Array[] = [];

	const parts = trimTrailingCrLf(input, options.boundaryText);
	const reader = parts.getReader();

	return new ReadableStream({
		async pull(controller) {
			try {
				let enqueued = false;
				do {
					let part: Uint8Array | "part-boundary";
					if (stack.length) {
						part = stack.pop()!;
					} else {
						const next = await reader.read();
						if (next.done) {
							controller.close();
							return;
						}
						part = next.value;
					}

					if (part === "part-boundary") {
						totalParts++;
						if (totalParts > options.maxParts) {
							throw options.createLimitError(
								"maxParts",
								totalParts,
								options.maxParts,
							);
						}

						if (state === "header") {
							controller.enqueue(headers);
							enqueued = true;
							headers = new Map();
							headerCount = 0;
							lastHeaderOffset = 0;

							crLfState = "none";
						} else {
							state = "header";
						}
					} else if (state === "header") {
						loop: for (let i = 0; i < part.length; i++) {
							if (crLfState === "none") {
								const crPos = part.indexOf(13, i);
								if (crPos === -1) {
									lastHeader.set(part.slice(i), lastHeaderOffset);
									lastHeaderOffset += part.length - i;
									break;
								} else {
									lastHeader.set(part.slice(i, crPos), lastHeaderOffset);
									lastHeaderOffset += crPos - i;
									i = crPos;
								}
							}

							const byte = part[i];

							switch (crLfState) {
								case "none":
									if (byte === 13) {
										crLfState = "cr";
									}
									break;
								case "cr":
									if (byte === 10) {
										crLfState = "cr-lf";
										const lastHeaderText = new TextDecoder().decode(
											lastHeader.slice(0, lastHeaderOffset - 1),
										);
										const [name, value] = lastHeaderText.split(": ", 2);
										append(headers, name.toLowerCase(), value.trim());
										headerCount++;
										if (headerCount >= options.maxHeaderCount) {
											throw options.createLimitError(
												"maxHeaderCount",
												headerCount,
												options.maxHeaderCount,
											);
										}
										lastHeaderOffset = 0;
										continue;
									} else {
										crLfState = "none";
									}
									break;
								case "cr-lf":
									if (byte === 13) {
										crLfState = "cr-lf-cr";
									} else {
										crLfState = "none";
									}
									break;
								case "cr-lf-cr":
									if (byte === 10) {
										controller.enqueue(headers);
										enqueued = true;
										crLfState = "none";
										state = "body";
										headers = new Map();
										headerCount = 0;
										lastHeaderOffset = 0;

										if (i + 1 < part.length) {
											stack.push(part.slice(i + 1));
										}
										break loop;
									}
							}

							lastHeader[lastHeaderOffset++] = byte;
							if (lastHeaderOffset === lastHeader.length) {
								throw options.createLimitError(
									"maxHeaderSize",
									lastHeaderOffset,
									options.maxHeaderSize,
								);
							}

							totalHeaderSize++;
							if (totalHeaderSize > options.maxTotalHeaderSize) {
								throw options.createLimitError(
									"maxTotalHeaderSize",
									totalHeaderSize,
									options.maxTotalHeaderSize,
								);
							}
						}
					} else if (part.length) {
						controller.enqueue(part);
						enqueued = true;
					}
				} while (!enqueued);
			} catch (err) {
				controller.error(err);
			}
		},
	});
}

function trimTrailingCrLf(
	input: ReadableStream<Uint8Array>,
	boundaryText: string,
): ReadableStream<Uint8Array | "part-boundary"> {
	const buffered: Uint8Array[] = [];
	let state: "cr" | "crlf" | "none" = "none";

	const transform = new TransformStream<
		Uint8Array | "part-boundary",
		Uint8Array | "part-boundary"
	>({
		transform(chunk, controller) {
			if (chunk !== "part-boundary") {
				if (!chunk.length) {
					return;
				}

				if (chunk.length === 1) {
					if (chunk[0] === 13) {
						for (const oldChunk of buffered) {
							controller.enqueue(oldChunk);
						}
						state = "cr";
						buffered.length = 0;
						buffered.push(chunk);
					} else if (state === "cr" && chunk[0] === 10) {
						state = "crlf";
						buffered.push(chunk);
					} else {
						for (const oldChunk of buffered) {
							controller.enqueue(oldChunk);
						}
						controller.enqueue(chunk);
						state = "none";
						buffered.length = 0;
					}
				} else {
					if (chunk[chunk.length - 1] === 13) {
						state = "cr";
						buffered.push(chunk);
					} else if (
						chunk[chunk.length - 1] === 10 &&
						chunk[chunk.length - 2] === 13
					) {
						state = "crlf";
						buffered.push(chunk);
					} else {
						for (const oldChunk of buffered) {
							controller.enqueue(oldChunk);
						}
						controller.enqueue(chunk);
						buffered.length = 0;
						state = "none";
					}
				}
			} else {
				if (state === "crlf") {
					if (buffered[buffered.length - 1].length === 1) {
						buffered.pop();
						if (buffered[buffered.length - 1].length === 1) {
							buffered.pop();
						} else {
							buffered[buffered.length - 1] = buffered[
								buffered.length - 1
							].slice(0, buffered[buffered.length - 1].length - 1);
						}
					} else {
						buffered[buffered.length - 1] = buffered[buffered.length - 1].slice(
							0,
							buffered[buffered.length - 1].length - 2,
						);
					}

					for (const oldChunk of buffered) {
						controller.enqueue(oldChunk);
					}
				}
				controller.enqueue("part-boundary");
				state = "none";
				buffered.length = 0;
			}
		},
	});

	return splitMultipart(input, boundaryText).pipeThrough(transform);
}

export function splitMultipart(
	input: ReadableStream<Uint8Array>,
	boundaryText: string,
): ReadableStream<Uint8Array | "part-boundary"> {
	const boundary = new TextEncoder().encode("--" + boundaryText);
	let partNo = 0;
	let state: "none" | "skip-space" | "skip-cr" | "skip-lf" | "dash1" | "ended" =
		"none";

	const transform = new TransformStream<
		Uint8Array | "part-boundary",
		Uint8Array | "part-boundary"
	>({
		transform(chunk, controller) {
			if (state === "ended") return;

			let start = 0;
			if (partNo === 0 && chunk !== "part-boundary") {
				// Preamble, skip
				return;
			} else if (chunk === "part-boundary") {
				if (partNo) controller.enqueue("part-boundary");
				partNo++;
				state = "skip-space";
				return;
			}

			if (state === "skip-space") {
				if (start < chunk.length && chunk[start] === 45) {
					state = "dash1";
					start++;
				} else {
					while (
						start < chunk.length &&
						(chunk[start] === 32 || chunk[start] === 9)
					) {
						start++;
					}

					if (start < chunk.length) {
						state = "skip-cr";
					}
				}
			}

			if (state === "dash1") {
				if (chunk[start] === 45) {
					state = "ended";
					return;
				}

				if (start === chunk.length) {
					state = "ended";
					return;
				}

				controller.enqueue(new Uint8Array([45]));
				state = "none";
			}

			if (state === "skip-cr") {
				if (start < chunk.length && chunk[start] === 13) {
					start++;
					state = "skip-lf";
				} else if (start < chunk.length) {
					state = "none";
				}
			}

			if (state === "skip-lf") {
				if (start < chunk.length && chunk[start] === 10) {
					start++;
					state = "none";
				} else if (start < chunk.length) {
					state = "none";
				}
			}

			if (state === "none") {
				controller.enqueue(chunk.slice(start));
			}
		},
	});

	return split(input, boundary, "part-boundary").pipeThrough(transform);
}

function append(headers: SimpleHeaders, key: string, value: string) {
	const existing = headers.get(key);
	if (existing) {
		headers.set(key, existing + ", " + value);
	}

	headers.set(key, value);
}

type ReadableStreamReadResult<T> =
	| ReadableStreamReadValueResult<T>
	| ReadableStreamReadDoneResult<T>;

interface ReadableStreamReadValueResult<T> {
	done: false;
	value: T;
}

interface ReadableStreamReadDoneResult<T> {
	done: true;
	value?: T;
}
