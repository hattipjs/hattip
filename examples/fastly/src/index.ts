import { createHandler } from "@hattip/adapter-fastly";

const handler = createHandler((ctx) => {
	const pathname = getPathname(ctx.request.url);

	if (pathname === "/") {
		return ctx.json({ hello: "world!" });
	}

	return ctx.response("Not found", { status: 404 });
});

addEventListener("fetch", (event) => {
	event.respondWith(handler(event));
});

function getPathname(href: string) {
	const pathStart = href.indexOf("/", 8);
	const pathEnd = href.indexOf("?", pathStart);
	if (pathEnd === -1) {
		return href.slice(pathStart);
	}

	return href.slice(pathStart, pathEnd);
}
