import { createHandler } from "@hattip/adapter-deno";
import { handler } from "./hattip-common.ts";

Deno.serve({ port: 3000 }, createHandler(handler));
