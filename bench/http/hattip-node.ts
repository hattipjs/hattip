import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";

createServer(
	createMiddleware((ctx) => {
		const headers: [string, string][] = [];
		for (const [key, value] of ctx.request.headers) {
			headers.push([key, value]);
		}

		return ctx.json({
			method: ctx.request.method,
			url: ctx.request.url,
			headers,
		});
	}),
).listen(3000);
