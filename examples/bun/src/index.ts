import { createHandler } from "@hattip/adapter-bun";

// Deno.serve(
// 	{ port: 3000 },
// 	createHandler((ctx) => {
// 		const pathname = getPathname(ctx.request.url);
// 		if (pathname === "/") {
// 			// if (ctx.request.method === "POST") {
// 			// 	return ctx.request.text().then((data) => ctx.json({ data }));
// 			// }
// 			return ctx.json({ hello: "world" });
// 		}
// 		return ctx.response("Not found", { status: 404 });
// 	}),
// );

const response = new Response("Hello world!");

Bun.serve({
	port: 3000,
	fetch: createHandler((ctx) => {
		const pathname = getPathname(ctx.request.url);

		if (pathname === "/") {
			// if (ctx.request.method === "POST") {
			// 	return ctx.request.text().then((data) => ctx.json({ data }));
			// }

			return response.clone(); // ctx.json({ hello: "world" });
		}

		return ctx.response("Not found", { status: 404 });
	}),
});

console.log("Server listening on http://localhost:3000");

function getPathname(href: string) {
	const pathStart = href.indexOf("/", 8);
	const pathEnd = href.indexOf("?", pathStart);
	if (pathEnd === -1) {
		return href.slice(pathStart);
	}

	return href.slice(pathStart, pathEnd);
}
