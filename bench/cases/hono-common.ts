import { Hono } from "hono";

export const app = new Hono();

app
	.get("/", (c) => c.text("Hi"))
	.post("/json", async (c) => {
		const json = await c.req.json();
		return c.json(json);
	})
	.get("/id/:id", (c) => {
		const id = c.req.param("id");
		const name = c.req.query("name");

		c.header("x-powered-by", "benchmark");

		return c.text(`${id} ${name}`);
	});
