import { transmuteIntoHattipError } from "@hattip/error";
import { createBodySizeLimitError, createUnsafeJsonError } from "./errors.ts";

/** Default body size limit (1MB) */
export const DEFAULT_BODY_SIZE_LIMIT = 1_048_576;

export interface ChunksOptions extends BodyParsingOptions {
	/** If set to true, all chunks will be normalized to have an ArrayBuffer backing. */
	normalize?: boolean;
}

/**
 * Collects the body of a stream into an array of Uint8Array chunks with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options that control body size limit and error handling.
 * @returns A promise that resolves to a tuple containing the total byte length and an array of Uint8Array chunks.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */

export async function chunks(
	stream: AsyncIterable<Uint8Array>,
	options?: ChunksOptions & { normalize: true },
): Promise<[byteLength: number, chunks: Uint8Array<ArrayBuffer>[]]>;

export async function chunks(
	stream: AsyncIterable<Uint8Array>,
	options?: ChunksOptions,
): Promise<[byteLength: number, chunks: Uint8Array[]]>;

export async function chunks(
	stream: AsyncIterable<Uint8Array>,
	options?: ChunksOptions,
): Promise<[byteLength: number, chunks: Uint8Array[]]> {
	const limit = options?.limit ?? DEFAULT_BODY_SIZE_LIMIT;
	const normalize = options?.normalize ?? false;

	const chunks: Uint8Array[] = [];
	let byteLength = 0;

	for await (let chunk of stream) {
		if (normalize && !(chunk.buffer instanceof ArrayBuffer)) {
			const normalized = new Uint8Array(chunk.byteLength);
			normalized.set(chunk);
			chunk = normalized;
		}

		byteLength += chunk.byteLength;
		if (byteLength > limit) {
			throw createBodySizeLimitError(limit, options?.exposeToClient);
		}
		chunks.push(chunk);
	}

	return [byteLength, chunks];
}

/** @internal */
export function concat(target: Uint8Array, chunks: Uint8Array[]) {
	let offset = 0;
	for (const chunk of chunks) {
		target.set(chunk, offset);
		offset += chunk.byteLength;
	}
}

const decodeOptions: TextDecodeOptions = { stream: true };

export interface BodyParsingOptions {
	/** Maximum allowed size of the body in bytes. @default DEFAULT_BODY_SIZE_LIMIT */
	limit?: number;
	/** Should errors be exposed to the client? @default false */
	exposeToClient?: boolean;
}

/** Options for the {@link text} function. */
export interface TextReaderOptions extends BodyParsingOptions {
	/** Character encoding to use for decoding. @default "utf-8" */
	encoding?: string;
	/** If `true`, throw on invalid byte sequences. @default false */
	fatal?: boolean;
	/** If `true`, the BOM will not be stripped from the output. @default true */
	ignoreBOM?: boolean;
}

/**
 * Collects the entire body of a stream into a string with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options controlling encoding, error handling, and body size limit.
 * @returns A promise that resolves to a string containing the decoded body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 * @throws {HattipError<"HTE_UNSUPPORTED_CHARSET">} If the encoding is not supported.
 */
export async function text(
	stream: AsyncIterable<Uint8Array>,
	options: TextReaderOptions = {},
): Promise<string> {
	const {
		limit = DEFAULT_BODY_SIZE_LIMIT,
		exposeToClient = false,
		encoding,
		fatal,
		ignoreBOM = true,
	} = options!;

	let result = "";
	let byteLength = 0;

	let decoder: TextDecoder;
	try {
		decoder = new TextDecoder(encoding, { fatal, ignoreBOM });
	} catch (error) {
		if (error instanceof RangeError) {
			transmuteIntoHattipError(error, {
				code: "HTE_UNSUPPORTED_CHARSET",
				title: "Unsupported charset",
				detail: `"${encoding}" is not a supported character encoding`,
				payload: { charset: encoding! }, // Assume utf8 is supported
				status: exposeToClient ? 415 : undefined,
			});
		}

		throw error;
	}

	for await (const chunk of stream) {
		byteLength += chunk.byteLength;

		if (byteLength > limit) {
			throw createBodySizeLimitError(limit, exposeToClient);
		}

		result += decoder.decode(chunk, decodeOptions);
	}

	result += decoder.decode();

	return result;
}

/** Options for the {@link blob} function. */
export interface BlobOptions extends BodyParsingOptions {
	/** MIME type to set on the resulting Blob. @default "" */
	type?: string;
	/** Line ending conversion. `"native"` converts `\n` to the platform's native line endings. @default "transparent" */
	endings?: "transparent" | "native";
}

/**
 * Collects the entire body of a stream into a Blob with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options controlling MIME type, body size limit, and error handling.
 * @returns A promise that resolves to a Blob containing the entire body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */
export function blob(
	stream: AsyncIterable<Uint8Array>,
	options?: BlobOptions,
): Promise<Blob> {
	return chunks(stream, { ...options, normalize: true }).then(([, parts]) => {
		return new Blob(parts, { type: options?.type, endings: options?.endings });
	});
}

export interface JsonParseOptions extends TextReaderOptions {
	reviver?:
		| ((this: any, key: string, value: any) => any)
		| "drop-unsafe"
		| "error-on-unsafe"
		| "ignore-unsafe";
}

/**
 * Collects the entire body of a stream and parses it as JSON.
 *
 * @param stream The input stream to read from.
 * @param options Options controlling encoding, JSON reviver, and body size limit.
 * @returns A promise that resolves to the parsed JSON value.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 * @throws {HattipError<"HTE_INVALID_JSON">} If the body is not valid JSON.
 * @throws {HattipError<"HTE_UNSAFE_JSON">} If the JSON contains unsafe keys (e.g. `__proto__`) and the reviver rejects them.
 */
export function json(
	stream: AsyncIterable<Uint8Array>,
	options?: JsonParseOptions,
): Promise<unknown> {
	function errorOnUnsafe(key: string, value: any): any {
		if (isUnsafeJsonKeyValuePair(key, value)) {
			throw createUnsafeJsonError(key, options?.exposeToClient);
		}
		return value;
	}

	let realFn: ((this: any, key: string, value: any) => any) | undefined;
	const reviver = options?.reviver ?? errorOnUnsafe;
	switch (reviver) {
		case "error-on-unsafe":
			realFn = errorOnUnsafe;
			break;
		case "drop-unsafe":
			realFn = dropUnsafe;
			break;
		case "ignore-unsafe":
			realFn = undefined;
			break;
		default:
			realFn = reviver;
	}

	return text(stream, options).then((text) => {
		try {
			return JSON.parse(text, realFn);
		} catch (error) {
			if (error instanceof SyntaxError) {
				transmuteIntoHattipError(error, {
					code: "HTE_INVALID_JSON",
					title: "Invalid JSON",
					payload: undefined,
					status: options?.exposeToClient ? 400 : undefined,
				});
			}

			throw error;
		}
	});
}

export function isUnsafeJsonKeyValuePair(key: string, value: any): boolean {
	if (key === "__proto__") return true;
	if (
		key === "constructor" &&
		value &&
		typeof value === "object" &&
		"prototype" in value
	) {
		return true;
	}
	return false;
}

function dropUnsafe(key: string, value: any): any {
	if (isUnsafeJsonKeyValuePair(key, value)) {
		return;
	}
	return value;
}
