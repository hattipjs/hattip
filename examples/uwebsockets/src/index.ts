import { App } from "uWebSockets.js";
import { createHandler } from "@hattip/adapter-uwebsockets";

const app = App();

app.any(
	"/*",
	createHandler((ctx) => {
		const pathname = getPathname(ctx.request.url);

		if (pathname === "/") {
			if (ctx.request.method === "POST") {
				return ctx.request.text().then((data) => {
					console.log("data");
					return ctx.json({ data });
				});
			}

			return ctx.json({ hello: "world" });
		}

		return ctx.response("Not found", { status: 404 });
	}),
);

function getPathname(href: string) {
	const pathStart = href.indexOf("/", 8);
	const pathEnd = href.indexOf("?", pathStart);
	if (pathEnd === -1) {
		return href.slice(pathStart);
	}

	return href.slice(pathStart, pathEnd);
}

app.listen(3000, () => {
	console.log("Server listening on http://localhost:3000");
});
