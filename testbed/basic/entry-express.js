// @ts-check
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import express from "express";

const middleware = createMiddleware(handler);

const app = express();

app.use(express.static("public"));
app.use(middleware);

app.listen(3000, "localhost", () => {
	console.log("Server listening on http://localhost:3000");
});
