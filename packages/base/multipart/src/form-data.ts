/* eslint-disable import/no-named-as-default-member */
import { parseMultipart } from "./multipart";
import { parseHeaderValue } from "@hattip/headers";
import {
	defaultCreateLimitError,
	DEFAULT_MAX_FILENAME_LENGTH,
	DEFAULT_MAX_FILE_SIZE,
	DEFAULT_MAX_TEXT_FIELD_SIZE,
	DEFAULT_MAX_TOTAL_FILE_SIZE,
} from "./limits";

export interface FormDataParserOptions<F> {
	/**
	 * File handler.
	 *
	 * It's called for each file part and should return a promise that resolves
	 * to a file value. The file value is a platform-specific representation of
	 * the file. It should be something other than a string so that it can be
	 * distinguished from a string field value. For example, it could be an
	 * object with a `path` property that points to a temporary file on disk.
	 */
	handleFile: FileHandler<F>;
	/** Create the error to throw when a limit is exceeded */
	createLimitError?(name: string, value: number, limit: number): Error;
	/**
	 * Create the error to throw when the Content-Type header is not multipart
	 * form-data with a boundary.
	 */
	createTypeError?(): Error;
	/**
	 * Create the error to throw when the Content-Disposition header is
	 * invalid. */
	createContentDispositionError?(): Error;
	/** The maximum number of headers @default 16 */
	maxHeaderCount?: number;
	/** The maximum size of a header in bytes @default 1024 */
	maxHeaderSize?: number;
	/** The maximum combined size of all headers in bytes @default 4096 (4K) */
	maxTotalHeaderSize?: number;
	/** The maximum number of parts (approximately equal to maximum number of fields) @default 1024 */
	maxParts?: number;
	/** The maximum size of a single text field value in bytes @default 65536 (64K) */
	maxTextFieldSize?: number;
	/** The maximum combined size of all text field values in bytes @default 1048576 (1M) */
	maxTotalTextFieldSize?: number;
	/** The maximum number of files @default 16 */
	maxFileCount?: number;
	/** The maximum filename length @default 128 */
	maxFilenameLength?: number;
	/** The maximum size of a single file in bytes @default 4194304 (4M) */
	maxFileSize?: number;
	/** The maximum combined size of all files in bytes @default 16777216 (16M) */
	maxTotalFileSize?: number;
}

export async function parseMultipartFormData<F>(
	request: Request,
	options: FormDataParserOptions<F>,
): Promise<MultipartFormData<Awaited<F>>> {
	const contentType = request.headers.get("content-type");
	const createTypeError =
		options.createTypeError || (() => new Error("Invalid content type"));
	const createContentDispositionError =
		options.createContentDispositionError ||
		(() => new Error("Invalid content disposition"));
	const createLimitError = options.createLimitError || defaultCreateLimitError;

	let totalFileSize = 0;
	const {
		maxFileSize = DEFAULT_MAX_FILE_SIZE,
		maxTotalFileSize = DEFAULT_MAX_TOTAL_FILE_SIZE,
	} = options;

	const match = parseHeaderValue(contentType || "")[0];
	if (
		!match ||
		match.value !== "multipart/form-data" ||
		!match.directives.boundary
	) {
		throw createTypeError();
	}

	if (!request.body) {
		return new MultipartFormData([]);
	}

	const parts = parseMultipart(request.body as any, {
		boundaryText: match.directives.boundary,
		maxHeaderSize: options.maxHeaderSize,
		maxHeaderCount: options.maxHeaderCount,
		maxParts: options.maxParts,
	});

	const fields: Array<[string, string | Awaited<F>]> = [];

	for await (const part of parts) {
		const headerValue = part.headers.get("content-disposition");
		if (!headerValue) {
			continue;
		}

		const { name, filename } = parseContentDisposition(
			headerValue,
			createContentDispositionError,
		);

		if (!name) {
			continue;
		}

		if (filename) {
			const sanitized = sanitizeFileName(
				filename,
				options.maxFilenameLength ?? DEFAULT_MAX_FILENAME_LENGTH,
			);

			let size = 0;
			const limiter = new TransformStream({
				transform(chunk, controller) {
					size += chunk.byteLength;
					if (size > maxFileSize) {
						controller.error(
							createLimitError("maxFileSize", size, maxFileSize),
						);
						return;
					}

					totalFileSize += chunk.byteLength;
					if (totalFileSize > maxTotalFileSize) {
						controller.error(
							createLimitError(
								"maxTotalFileSize",
								totalFileSize,
								maxTotalFileSize,
							),
						);
						return;
					}

					controller.enqueue(chunk);
				},
			});

			const file = await options.handleFile({
				name,
				filename: sanitized,
				unsanitizedFilename: filename,
				contentType:
					part.headers.get("content-type") || "application/octet-stream",
				body: part.body.pipeThrough(limiter),
			});

			fields.push([name, file as Awaited<F>]);
		} else {
			fields.push([
				name,
				await readPartBody(
					part.body,
					options.maxTextFieldSize ?? DEFAULT_MAX_TEXT_FIELD_SIZE,
					createLimitError,
				),
			]);
		}
	}

	return new MultipartFormData(fields);
}

export class MultipartFormData<F> {
	private _fields: Array<[string, string | F]>;

	constructor(fields: Array<[string, string | F]>) {
		this._fields = fields;
	}

	get(name: string): string | F | null {
		return this._fields.find(([fieldName]) => fieldName === name)?.[1] ?? null;
	}

	getAll(name: string): Array<string | F> {
		return this._fields
			.filter(([fieldName]) => fieldName === name)
			.map(([, value]) => value);
	}

	has(name: string): boolean {
		return this._fields.some(([fieldName]) => fieldName === name);
	}

	forEach(
		callback: (
			value: string | F,
			name: string,
			parent: MultipartFormData<F>,
		) => void,
	): void {
		this._fields.forEach(([name, value]) => callback(value, name, this));
	}

	*entries(): IterableIterator<[string, string | F]> {
		yield* this._fields;
	}

	*keys(): IterableIterator<string> {
		yield* this._fields.map(([name]) => name);
	}

	*values(): IterableIterator<string | F> {
		yield* this._fields.map(([, value]) => value);
	}

	[Symbol.iterator](): IterableIterator<[string, string | F]> {
		return this.entries();
	}
}

export type FileHandler<F> = (fileInfo: FileInfo) => F;

type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

export interface FileInfo {
	/** Name of the field that contains the file */
	name: string;
	/** The name of the file, sanitized */
	filename: string;
	/** The unsanitized name of the file as sent by the client */
	unsanitizedFilename: string;
	/**
	 * The content type of the file as sent by the client.
	 *
	 * Defaults to `application/octet-stream`
	 */
	contentType: string;
	/**
	 * File content as a readable stream.
	 *
	 * You have to consume the stream before the next `FileHandler` callback
	 * called. Otherwise the it will be consumed when you return. You can't
	 * save the stream and consume it later.
	 */
	body: ReadableStream<Uint8Array>;
}

async function readPartBody(
	body: ReadableStream<Uint8Array>,
	maxSize: number,
	createLimitError: (name: string, value: number, limit: number) => Error,
): Promise<string> {
	const decoder = new TextDecoder();
	let result = "";
	let size = 0;
	const reader = body.getReader();

	for (;;) {
		const { value, done } = await reader.read();
		if (done) {
			break;
		}

		size += value.byteLength;
		if (size > maxSize) {
			throw createLimitError("maxTextFieldSize", size, maxSize);
		}

		result += decoder.decode(value, { stream: true });
	}

	decoder.decode();

	return result;
}

function parseContentDisposition(
	value: string,
	createError: () => Error,
): ContentDisposition {
	const parsed = parseHeaderValue(value)[0];

	if (parsed?.value !== "form-data") {
		throw createError();
	}

	const { name, filename } = parsed.directives;

	return { name, filename };
}

interface ContentDisposition {
	name?: string | null;
	filename?: string | null;
}

function sanitizeFileName(filename: string, max: number): string {
	filename = filename
		// eslint-disable-next-line no-control-regex
		.replace(/[\0-\x1f\x80-\xff]+/g, " ") // Replace series of control and non-ASCII characters with a single space
		.replace(/[/\\?<>:*|"]/g, "_") // Replace reserved characters with an underscore
		.replace(/[ .]+$/, ""); // Remove trailing spaces and periods

	if (filename.length > max) {
		filename = filename.slice(0, max);
	}

	if (RESERVED_FILE_NAMES.has(filename.toUpperCase())) {
		filename += "_";
	} else {
		filename = REPLACEMENT_NAMES[filename] ?? filename;
	}

	return filename;
}

const RESERVED_FILE_NAMES = new Set([
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9",
]);

const REPLACEMENT_NAMES: Record<string, string | undefined> = {
	"": "_",
	".": "dot",
	"..": "dotdot",
};
