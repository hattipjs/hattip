export const DEFAULT_MAX_HEADER_COUNT = 16;
export const DEFAULT_MAX_HEADER_SIZE = 1024;
export const DEFAULT_MAX_TOTAL_HEADER_SIZE = 4 * 1024;
export const DEFAULT_MAX_PARTS = 1024;
export const DEFAULT_MAX_TEXT_FIELD_SIZE = 64 * 1024;
export const DEFAULT_MAX_TOTAL_TEXT_FIELD_SIZE = 1024 * 1024;
export const DEFAULT_MAX_FILE_COUNT = 16;
export const DEFAULT_MAX_FILENAME_LENGTH = 128;
export const DEFAULT_MAX_FILE_SIZE = 4 * 1024 * 1024;
export const DEFAULT_MAX_TOTAL_FILE_SIZE = 16 * 1024 * 1024;

export function defaultCreateLimitError(
	name: string,
	value: number,
	limit: number,
) {
	return new Error(`${name} exceeded limit of ${limit} bytes: ${value}`);
}
