import { createHandler } from "@hattip/adapter-cloudflare";

export default {
	fetch: createHandler<ExportedHandler<Env>>((ctx) => {
		const pathname = getPathname(ctx.request.url);

		if (pathname === "/") {
			return ctx.response("Hi!");
		}

		return ctx.response("Not found", { status: 404 });
	}),
} satisfies ExportedHandler<Env>;

function getPathname(href: string) {
	const pathStart = href.indexOf("/", 8);
	const pathEnd = href.indexOf("?", pathStart);
	if (pathEnd === -1) {
		return href.slice(pathStart);
	}

	return href.slice(pathStart, pathEnd);
}
