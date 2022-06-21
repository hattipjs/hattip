// @ts-check
import { createListener } from "@hattip/adapter-node";
import handler from "./index.js";
import express from "express";

const middleware = createListener(handler, {
  staticAssetsDir: "public",
});

const app = express();

app.use(middleware);

app.listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
