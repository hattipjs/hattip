// @ts-check
import { createServer } from "http";
import connect from "connect";
import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import handler from "./index.js";
import sirv from "sirv";

const app = connect();

app.use(sirv("public"));
app.use(createMiddleware(handler));

createServer(app).listen(3000, "127.0.0.1", () => {
	console.log("Server listening on http://127.0.0.1:3000");
});
