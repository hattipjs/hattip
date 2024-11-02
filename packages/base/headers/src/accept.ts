import { parseHeaderValue } from "./parser";
import { parseQValue } from "./q";

/**
 * Performs content negotiation on the `Accept` header.
 *
 * @example
 * ```ts
 * const handler = accept("text/html, application/json", {
 *  "text/html": () => html("<h1>Hello world!</h1>"),
 *  "application/json": () => json({ message: "Hello world!" }),
 *  "*": () => new Response("Unacceptable", { status: 406 }),
 * });
 *
 * const response = handler();
 * console.assert(response.headers.get("content-type") === "text/html");
 * ```
 *
 * `q` values and partial and full wildcard requests are supported.
 *
 * @param header The value of the Accept header.
 * @param provided A map of content types to values. The value of the `*` key
 * is used if no other match is found.
 * @returns The value of the best match, or undefined if no match was found.
 */
export function accept<R extends Record<string, unknown>>(
	header: string | null,
	provided: R,
): typeof provided extends { "*": infer T } ? T : R[keyof R] | undefined {
	header = header ?? "*";

	const accepts = parseHeaderValue(header).sort(
		(a, b) => parseQValue(b.directives.q) - parseQValue(a.directives.q),
	);

	for (const accept of accepts) {
		for (const type of Object.keys(provided)) {
			if (typesMatch(accept.value, type)) {
				return provided[type] as any;
			}
		}
	}

	return (provided["*"] ?? provided["*"]) as any;
}

function typesMatch(requested: string, provided: string): boolean {
	requested = requested.toLowerCase();
	provided = provided.toLowerCase();

	if (requested === provided || requested === "*/*") {
		return true;
	}

	if (requested.endsWith("/*")) {
		return provided.startsWith(requested.slice(0, -1));
	}

	return false;
}
