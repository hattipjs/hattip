/**
 * Registry of error codes to their payload types.
 * Extend this interface via declaration merging to register custom error codes.
 *
 * @example
 * ```ts
 * declare module "@hattip/error" {
 *   interface HattipErrorPayloads {
 *     MY_INVALID_INPUT: { field: string; reason: string };
 *   }
 * }
 * ```
 */
export interface HattipErrorPayloads {
	HTE_UNKNOWN: undefined;
}

/** Union of all registered error codes. */
export type HattipErrorCode = keyof HattipErrorPayloads;

/** Maps to the built-in error constructors: TypeError, RangeError, SyntaxError, URIError. */
export type ErrorCategory = "type" | "range" | "syntax" | "uri";

/** Resolves the payload type for a given error code. Returns `unknown` for unregistered codes. */
export type PayloadForCode<Code> = Code extends HattipErrorCode
	? HattipErrorPayloads[Code]
	: unknown;

/** Structured metadata describing a Hattip error. */
export interface ErrorInfo<Code extends HattipErrorCode> {
	/** Hattip error code */
	code: Code;
	/** Exposed HTTP response status. Use undefined to avoid exposing this error to the client. */
	status?: number;
	/** Error constructor */
	category?: ErrorCategory;
	/** Human readable form of `code` */
	title?: string;
	/** Human readable error message specific to this error */
	detail?: string;
	/** A URL that describes details for this specific error instance */
	instance?: string;
	/** Error payload */
	payload: PayloadForCode<Code>;
}

const HATTIP_ERROR_URL_PREFIX = "https://hattipjs.org/public/errors";

function constructorFromCategory(
	category?: ErrorCategory,
):
	| typeof Error
	| typeof TypeError
	| typeof RangeError
	| typeof SyntaxError
	| typeof URIError {
	switch (category) {
		case "type":
			return TypeError;
		case "range":
			return RangeError;
		case "syntax":
			return SyntaxError;
		case "uri":
			return URIError;
		default:
			return Error;
	}
}

function categoryFromConstructor(
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	constructor: Function,
): ErrorCategory | undefined {
	switch (constructor) {
		case TypeError:
			return "type";
		case RangeError:
			return "range";
		case SyntaxError:
			return "syntax";
		case URIError:
			return "uri";
	}
}

/** An `Error` instance augmented with Hattip error metadata. */
export type HattipError<Code extends HattipErrorCode = HattipErrorCode> =
	Error & {
		/** Brand to determine if it's a HattipError */
		isHattipError: true;
		/** Debug info on the server */
		serverStack?: string;
	} & ErrorInfo<Code>;

/** Creates a new {@link HattipError} from the given {@link ErrorInfo}. */
export function createError<Code extends HattipErrorCode>(
	info: ErrorInfo<Code>,
): HattipError<Code> {
	const error = new (constructorFromCategory(info.category))(info.title);
	transmuteIntoHattipError(error, info);
	return error;
}

/** Mutates an existing `Error` in-place, attaching Hattip error metadata. */
export function transmuteIntoHattipError<Code extends HattipErrorCode>(
	error: Error,
	info: Omit<ErrorInfo<Code>, "category">,
): asserts error is HattipError<Code> {
	const hattipError = error as Error & HattipError<Code>;
	hattipError.isHattipError = true;
	Object.assign(hattipError, info);
	hattipError.category = categoryFromConstructor(error.constructor);
}

/** Type guard that checks whether a value is a {@link HattipError}, optionally narrowing to a specific code. */
export function isHattipError<Code extends HattipErrorCode>(
	error: unknown,
	code?: Code,
): error is HattipError<Code> {
	const asHattipError = error as HattipError<Code>;
	return (
		asHattipError instanceof Error &&
		asHattipError.isHattipError === true &&
		(code === undefined || asHattipError.code === code)
	);
}

/**
 * RFC 7807 Problem Details object (`application/problem+json`).
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemJson {
	/**
	 * A URL identifying the problem type. Should point to human-readable
	 * documentation when visited.
	 */
	type?: string;

	/**
	 * A short, human-readable summary of the problem type. Should stay
	 * consistent across occurrences of the same problem type.
	 */
	title?: string;

	/** The HTTP status code for this occurrence of the problem. */
	status?: number;

	/** A human-readable explanation specific to this occurrence of the problem. */
	detail?: string;

	/** A URL identifying this specific occurrence of the problem. */
	instance?: string;
}

/** {@link ProblemJson} extended with Hattip-specific fields. */
export interface HattipProblemJson extends ProblemJson {
	/** Hattip error code */
	code: string;
	/** Error constructor */
	category?: ErrorCategory;
	/** Error payload */
	payload: unknown;
	/** Debug info */
	stack?: string;
}

/**
 * Serializes a {@link HattipError} into a {@link ProblemJson} for client consumption.
 *
 * When `debug` is false and the error has no `status`, returns a generic
 * `{ status: 500 }` to avoid leaking internal details. Setting `status` on an
 * error signals that it is safe to expose to the client.
 *
 * @param codePrefixToUrlPrefixMappings - Maps error code prefixes (the part
 *   before the first underscore) to URL prefixes used to build the `type` URL.
 *   Codes prefixed with `HTE` default to `https://hattipjs.org/public/errors`.
 *
 * @example
 * ```ts
 * // Built-in HTE prefix:
 * //   code "HTE_UNKNOWN" → type "https://hattipjs.org/public/errors/HTE_UNKNOWN"
 *
 * // Custom prefix mapping:
 * toProblemJson(error, false, {
 *   MYAPP: "https://example.com/errors",
 * });
 * //   code "MYAPP_NOT_FOUND" → type "https://example.com/errors/MYAPP_NOT_FOUND"
 * ```
 */
export function toProblemJson(
	error: HattipError,
	debug = false,
	codePrefixToUrlPrefixMappings?: Record<string, string>,
): ProblemJson {
	if (!debug && !error.status) {
		return { status: 500 };
	}

	const underscorePosition = error.code.indexOf("_");
	const end = underscorePosition < 0 ? undefined : underscorePosition;
	const prefix = error.code.slice(0, end);
	const urlPrefix =
		codePrefixToUrlPrefixMappings?.[prefix] ??
		(prefix === "HTE" ? HATTIP_ERROR_URL_PREFIX : undefined);

	const result: HattipProblemJson = {
		type: urlPrefix && `${urlPrefix}/${error.code}`,
		title: error.title,
		status: error.status ?? 500,
		detail: error.detail,
		instance: error.instance,

		category: error.category,
		code: error.code,
		payload: error.payload as any,
		stack: debug ? error.stack : undefined,
	};

	return result;
}

/**
 * Deserializes a {@link ProblemJson} back into a {@link HattipError}.
 *
 * Matches the `type` URL against `knownUrlPrefixes` (and the built-in
 * `https://hattipjs.org/public/errors` prefix) to reconstruct the original
 * error. The first matching prefix wins, so order prefixes from most specific
 * to least specific if they overlap.
 *
 * Falls back to `HTE_UNKNOWN` if no prefix matches.
 *
 * @example
 * ```ts
 * // Recognizes built-in HTE errors automatically:
 * fromProblemJson({ type: "https://hattipjs.org/public/errors/HTE_UNKNOWN", status: 500 });
 *
 * // Register custom prefixes to recognize your own error types:
 * fromProblemJson(
 *   { type: "https://example.com/errors/MYAPP_NOT_FOUND", status: 404 },
 *   ["https://example.com/errors"],
 * );
 * ```
 */
export function fromProblemJson(
	json: ProblemJson,
	knownUrlPrefixes: string[] = [],
): HattipError {
	const prefixes = [...knownUrlPrefixes, HATTIP_ERROR_URL_PREFIX];
	if (json.type) {
		for (const prefix of prefixes) {
			const withSlash = prefix + "/";
			if (json.type.startsWith(withSlash)) {
				const error = createError<any>(json as HattipProblemJson);
				error.serverStack = (json as HattipProblemJson).stack;
				return error;
			}
		}
	}

	return createError({
		code: "HTE_UNKNOWN",
		title: json.title,
		status: json.status,
		detail: json.detail,
		instance: json.instance,
		payload: undefined,
	});
}
