// @ts-check
import { createServer } from "node:http";
import connect from "connect";
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import { createStaticHandlerFromFs } from "@hattip/adapter-node/static";

const app = connect();

app.use(
	createStaticHandlerFromFs({
		root: "public",
	}),
);
app.use(createMiddleware(handler));

createServer(app).listen(3000, "127.0.0.1", () => {
	console.log("Server listening on http://127.0.0.1:3000");
});
