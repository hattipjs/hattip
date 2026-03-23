import { app } from "./hono-common.ts";
import { serve } from "@hono/node-server";

serve(app);
