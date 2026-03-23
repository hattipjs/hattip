import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.all("/*", (c) => {
	const headers: [string, string][] = [];
	for (const [key, value] of c.req.raw.headers) {
		headers.push([key, value]);
	}

	return c.json({
		method: c.req.method,
		url: c.req.url,
		headers,
	});
});

serve(app);
