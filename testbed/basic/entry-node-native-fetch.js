// @ts-check
import { createServer } from "http";
import connect from "connect";
import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import handler from "./index.js";
import sirv from "sirv";

const app = connect();

app.use(sirv("public"));
app.use(createMiddleware(handler));

createServer(app).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
