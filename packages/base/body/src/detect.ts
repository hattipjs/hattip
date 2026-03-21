import { arrayBuffer as arrayBufferWeb, bytes as bytesWeb } from "./web.ts";
import { arrayBuffer as arrayBufferNode, bytes as bytesNode } from "./node.ts";

export {
	DEFAULT_BODY_SIZE_LIMIT,
	blob,
	chunks,
	json,
	text,
	isUnsafeJsonKeyValuePair,
	type BlobOptions,
	type BodyParsingOptions,
	type ChunksOptions,
	type TextReaderOptions,
	type JsonParseOptions,
} from "./common.ts";

const IS_GLOBAL_BUFFER_AVAILABLE = typeof Buffer !== "undefined";

/**
 * Collects the entire body of a stream into an ArrayBuffer with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options that control body size limit and error handling
 * @returns A promise that resolves to an ArrayBuffer containing the entire body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */
export const arrayBuffer = IS_GLOBAL_BUFFER_AVAILABLE
	? arrayBufferNode
	: arrayBufferWeb;

/**
 * Collects the entire body of a stream into a Uint8Array with a size limit.
 *
 * @param stream The input stream to read from.
 * @param options Options that control body size limit and error handling
 * @returns A promise that resolves to a Uint8Array containing the entire body.
 * @throws {HattipError<"HTE_BODY_TOO_LARGE">} If the body exceeds the size limit.
 */
export const bytes = IS_GLOBAL_BUFFER_AVAILABLE ? bytesNode : bytesWeb;
