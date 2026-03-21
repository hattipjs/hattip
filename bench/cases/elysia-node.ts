import { Elysia } from "elysia";
import { node } from "@elysiajs/node";

new Elysia({ adapter: node() })
	.get("/", () => "Hi")
	.post("/json", ({ body }) => body)
	.get("/id/:id", ({ params: { id }, query, set }) => {
		set.headers["x-powered-by"] = "benchmark";
		return `${id} ${query["name"]}`;
	})
	.listen(3000);
