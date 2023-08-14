/*
    RFC 3986 bans square brackets, vertical bar, and caret but
    WhatWG URL standard allows them. Still:
    - Firefox and Chrome escape caret
    - Chrome also escapes vertical bar
    - Chrome doesn't allow %00 in decoded or encoded form
*/
const PATH_CHARS = /[A-Za-z0-9-._~!$&'()*+,;=:@[\]|^]/;

export function normalizePathSegment(segment: string): string {
	// - Apply Unicode Normalization Form C (Canonical Decomposition followed by Canonical Composition)
	// - Encode stray percent signs that are not followed by two hex digits
	// - Decode percent-encoded chars that are allowed in pathnames
	// - Convert all percent encodings to uppercase
	// - Encode non-alllowed chars
	// - Encode . and ..

	const result = segment
		.normalize("NFC")
		.replace(
			/%(?:[0-9a-fA-F]{2})|[^A-Za-z0-9-._~!$&'()*+,;=:@[\]|^]/gu,
			(match) => {
				if (match.length < 3) {
					return encodeURIComponent(match);
				} else if (match[1] <= "7") {
					const decoded = decodeURIComponent(match);
					if (decoded.match(PATH_CHARS)) {
						return decoded;
					}
				}

				return match.toUpperCase();
			},
		);

	if (result === ".") {
		return "%2E";
	} else if (result === "..") {
		return "%2E%2E";
	}

	return result;
}
