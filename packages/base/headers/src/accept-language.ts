import { parseHeaderValue } from "./parser";
import { parseQValue } from "./q";

/**
 * Performs content negotiation on the `Accept-Language` header.
 *
 * @example
 * ```ts
 * const handler = acceptLanguage("en-US, fr;q=0.8", {
 *   "en-US": () => "Hello!",
 *   "fr": () => "Bonjour!",
 *   "*": () => "Hello!",
 * });
 *
 * const result = handler();
 * console.assert(result === "Hello!");
 * ```
 *
 * `q` values and wildcard requests are supported.
 *
 * @param header The value of the Accept-Language header.
 * @param provided A map of languages to values. The value of the `*` key
 * is used if no other match is found.
 */
export function acceptLanguage<R extends Record<string, unknown>>(
	header: string | null,
	provided: R,
): R extends { "*": infer T } ? T : R[keyof R] | undefined {
	header = header ?? "*";

	const accepts = parseHeaderValue(header).sort(
		(a, b) => parseQValue(b.directives.q) - parseQValue(a.directives.q),
	);

	for (const accept of accepts) {
		for (const type of Object.keys(provided)) {
			if (languagesMatch(accept.value, type)) {
				return provided[type] as any;
			}
		}
	}

	return provided["*"] as any;
}

function languagesMatch(requested: string, provided: string): boolean {
	if (requested === provided || requested === "*") {
		return true;
	}

	const r = requested.split("-");
	const p = provided.split("-");

	return r.length < p.length && r.every((part, i) => part === p[i]);
}
