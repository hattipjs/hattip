import { chunks, concat, type BodyParsingOptions } from "./common.ts";

export {
	DEFAULT_BODY_SIZE_LIMIT,
	blob,
	chunks,
	text,
	json,
	isUnsafeJsonKeyValuePair,
	type BlobOptions,
	type BodyParsingOptions,
	type ChunksOptions,
	type TextReaderOptions,
	type JsonParseOptions,
} from "./common.ts";

/**
 * Collects the entire body of a stream into an ArrayBuffer with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options that control body size limit and error handling
 * @returns A promise that resolves to an ArrayBuffer containing the entire body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */
export function arrayBuffer(
	stream: AsyncIterable<Uint8Array>,
	options?: BodyParsingOptions,
): Promise<ArrayBuffer> {
	return chunks(stream, options).then(([byteSize, chunks]) => {
		// We need the underlying ArrayBuffer to be of exact size so we can't use Buffer.concat here
		const buffer = Buffer.allocUnsafeSlow(byteSize);
		concat(buffer, chunks);

		return buffer.buffer;
	});
}

/**
 * Collects the entire body of a stream into a Uint8Array with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options that control body size limit and error handling
 * @returns A promise that resolves to a Uint8Array containing the entire body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */
export function bytes(
	stream: AsyncIterable<Uint8Array>,
	options?: BodyParsingOptions,
): Promise<Uint8Array> {
	return chunks(stream, options).then(([byteLength, chunks]) => {
		const buffer = Buffer.concat(chunks, byteLength);
		// Buffer is subtly incompatible with Uint8Array
		const array = new Uint8Array(
			buffer.buffer,
			buffer.byteOffset,
			buffer.byteLength,
		);
		return array;
	});
}
