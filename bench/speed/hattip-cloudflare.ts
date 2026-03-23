import { createHandler } from "@hattip/adapter-cloudflare";
import { handler } from "./hattip-common.ts";

export default {
	fetch: createHandler(handler),
};
