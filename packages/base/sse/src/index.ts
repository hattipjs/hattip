/**
 * Create a text response. Content-Type is set to "text/plain; charset=utf-8"
 * unless explicitly set.
 */
export function text(text: string, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/plain; charset=utf-8");
	}

	return new Response(text, {
		...init,
		headers,
	});
}

/**
 * Create a JSON response. Content-Type is set to
 * "application/json; charset=utf-8" unless explicitly set.
 */
export function json(value: unknown, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json; charset=utf-8");
	}

	return new Response(JSON.stringify(value), {
		...init,
		headers,
	});
}

/**
 * Create an HTML response. Content-Type is set to "text/html; charset=utf-8"
 * unless explicitly set.
 */
export function html(html: string, init?: ResponseInit) {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "text/html; charset=utf-8");
	}

	return new Response(html, {
		...init,
		headers,
	});
}
