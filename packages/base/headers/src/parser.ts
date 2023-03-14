/**
 * Parses a header value into an array of parts, each with a value and a set of
 * directives.
 *
 * For example a header value of `text/html; q=0.8; charset=utf-8, text/plain; q=0.5` would be parsed into:
 *
 * ```ts
 * [
 *   {
 *     value: "text/html",
 *     directives: {
 *       q: "0.5",
 *       charset: "utf-8",
 *     },
 *   },
 *   {
 *     value: "text/plain",
 *     directives: {
 *       q: "0.5",
 *     },
 *   },
 * ];
 * ```
 *
 * @param val The header value to parse.
 */
export function parseHeaderValue(value: string | null): ParsedHeaderValue[] {
	if (!value) {
		return [];
	}

	const val = value;

	let index = 0;
	const parts: ParsedHeaderValue[] = [];

	for (;;) {
		const part = parsePart();
		if (!part) {
			return parts;
		}

		parts.push(part);

		eatComment();
		if (val[index] !== ",") {
			return parts;
		}

		index++;
	}

	function parsePart(): ParsedHeaderValue | null {
		const text = parseValue();
		if (!text) {
			return null;
		}

		eatComment();
		if (val[index] === ";") {
			index++;
			return { value: text, directives: parseDirectives() };
		}

		return { value: text, directives: {} };
	}

	function parseDirectives() {
		const directives: Record<string, string | null> = {};

		for (;;) {
			const name = parseValue();
			if (!name) {
				return directives;
			}

			eatWhiteSpace();
			if (val[index] !== "=") {
				directives[name] = null;
				return directives;
			}

			index++;
			directives[name] = parseValue();

			eatWhiteSpace();
			if (val[index] !== ";") {
				return directives;
			}

			index++;
		}
	}

	function parseValue() {
		eatWhiteSpace();

		if (val[index] === '"') {
			const match = val.slice(index + 1).match(/[^"(]*/)!;
			index += match[0].length + 2;
			return match[0];
		} else {
			const match = val.slice(index).match(/[^=,;(]*/)!;
			index += match[0].length;
			return match[0].trimEnd();
		}
	}

	function eatWhiteSpace() {
		index = val.slice(index).search(/[^ \t]/) + index;
	}

	function eatComment() {
		eatWhiteSpace();
		if (val[index] !== "(") {
			return;
		}

		const pos = val.indexOf(")", index);
		if (pos === -1) {
			index = val.length;
			return;
		}

		index = pos + 1;
		eatWhiteSpace();

		return;
	}
}

/**
 * A parsed header value
 *
 * For example a header value of `text/html; q=0.8; charset=utf-8, text/plain; q=0.5` would be parsed into:
 *
 * ```ts
 * [
 *   {
 *     value: "text/html",
 *     directives: {
 *       q: "0.5",
 *       charset: "utf-8",
 *     },
 *   },
 *   {
 *     value: "text/plain",
 *     directives: {
 *       q: "0.5",
 *     },
 *   },
 * ];
 * ```
 */
export interface ParsedHeaderValue {
	/** The primary value of the part */
	value: string;
	/** The directives of the part */
	directives: Record<string, string | null>;
}
