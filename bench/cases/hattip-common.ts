import { type HattipHandler } from "@hattip/core";

export const handler: HattipHandler = (ctx) => {
	const [pathname, search] = split(ctx.request.url);
	const method = ctx.request.method;

	if (pathname === "/" && method === "GET") {
		return ctx.response("Hi");
	}

	if (pathname === "/json" && method === "POST") {
		return ctx.request.json().then((data) => ctx.json(data));
	}

	if (pathname.startsWith("/id/") && method === "GET") {
		const id = pathname.slice(4);
		const name = search ? new URLSearchParams(search).get("name") : null;

		return ctx.response(`${id} ${name}`, {
			headers: [["x-powered-by", "benchmark"]],
		});
	}

	return ctx.response("Not Found", { status: 404 });
};

function split(href: string): [path: string, search?: string] {
	const pathStart = href.indexOf("/", 8);
	const questionMarkIndex = href.indexOf("?", pathStart);
	if (questionMarkIndex < 0) {
		return [href.slice(pathStart)];
	}

	return [
		href.slice(pathStart, questionMarkIndex),
		href.slice(questionMarkIndex + 1),
	];
}
