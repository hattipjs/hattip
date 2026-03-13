import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";

createServer(
	createMiddleware(async (ctx) => {
		console.log(ctx.request.method, ctx.request.url);

		if (ctx.request.method === "POST") {
			const text = await ctx.request.text();
			console.log("Received POST data:", text);
		}

		return new Response("Hello, world!");
	}),
).listen(3000, () => {
	console.log("Server is running on http://localhost:3000");
});
