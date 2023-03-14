export function parseHeaderValue(value: string): ParsedHeaderValue[] {
	let index = 0;
	const parts: ParsedHeaderValue[] = [];

	for (;;) {
		const part = parsePart();
		if (!part) {
			return parts;
		}

		parts.push(part);

		eatComment();
		if (value[index] !== ",") {
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
		if (value[index] === ";") {
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
			if (value[index] !== "=") {
				directives[name] = null;
				return directives;
			}

			index++;
			directives[name] = parseValue();

			eatWhiteSpace();
			if (value[index] !== ";") {
				return directives;
			}

			index++;
		}
	}

	function parseValue() {
		eatWhiteSpace();

		if (value[index] === '"') {
			const match = value.slice(index + 1).match(/[^"(]*/)!;
			index += match[0].length + 2;
			return match[0];
		} else {
			const match = value.slice(index).match(/[^=,;(]*/)!;
			index += match[0].length;
			return match[0].trimEnd();
		}
	}

	function eatWhiteSpace() {
		index = value.slice(index).search(/[^ \t]/) + index;
	}

	function eatComment() {
		eatWhiteSpace();
		if (value[index] !== "(") {
			return;
		}

		const pos = value.indexOf(")", index);
		if (pos === -1) {
			index = value.length;
			return;
		}

		index = pos + 1;
		eatWhiteSpace();

		return;
	}
}

export interface ParsedHeaderValue {
	value: string;
	directives: Record<string, string | null>;
}
