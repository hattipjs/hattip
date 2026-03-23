import { createServer } from "node:http";
import { createMiddleware } from "@hattip/adapter-node";
import { handler } from "./hattip-common.ts";

createServer(createMiddleware(handler)).listen(3000);
