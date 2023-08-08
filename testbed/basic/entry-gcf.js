// @ts-check
import connect from "connect";
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";
import sirv from "sirv";

const app = connect();

app.use(sirv("public"));
app.use(createMiddleware(handler));

export { app as function };
