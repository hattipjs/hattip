import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";

createServer(
	createMiddleware(
		(ctx) => {
			const pathname = getPathname(ctx.request.url);

			if (pathname === "/") {
				// if (ctx.request.method === "POST") {
				// 	return ctx.request.text().then((data) => ctx.json({ data }));
				// }

				return ctx.json({ hello: "world" });
			}

			if (pathname === "/json" && ctx.request.method === "POST") {
				return ctx.request.json().then((data) => ctx.json(data));
			}

			return ctx.response("Not found", { status: 404 });
		},
		{
			// origin: "http://localhost:3000",
		},
	),
).listen(3000, () => {
	console.log("Server is running on http://localhost:3000");
});

function getPathname(href: string) {
	const pathStart = href.indexOf("/", 8);
	const pathEnd = href.indexOf("?", pathStart);
	if (pathEnd === -1) {
		return href.slice(pathStart);
	}

	return href.slice(pathStart, pathEnd);
}
