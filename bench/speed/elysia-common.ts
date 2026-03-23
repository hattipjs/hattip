import { Elysia } from "elysia";

export const app = new Elysia()
	.get("/", () => "Hi")
	.post("/json", ({ body }) => body)
	.get("/id/:id", ({ params: { id }, query, set }) => {
		set.headers["x-powered-by"] = "benchmark";
		return `${id} ${query["name"]}`;
	});
