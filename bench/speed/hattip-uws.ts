import { App } from "uWebSockets.js";
import { createHandler } from "@hattip/adapter-uwebsockets";
import { handler } from "./hattip-common.ts";

const app = App();

app.any("/*", createHandler(handler));

app.listen(3000, () => {});
