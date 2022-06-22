// @ts-check
import { createMiddleware } from "@hattip/adapter-node";
import handler from "./index.js";

export default createMiddleware(handler, { trustProxy: true });
