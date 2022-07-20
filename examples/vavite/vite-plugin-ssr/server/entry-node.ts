import { createMiddleware } from "@hattip/adapter-node";
import handler from ".";

export default createMiddleware(handler);
