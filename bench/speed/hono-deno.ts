import { app } from "./hono-common.ts";

Deno.serve({ port: 3000 }, app.fetch);
