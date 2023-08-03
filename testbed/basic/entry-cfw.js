// @ts-check
import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./index.js";

export default {
	fetch: cloudflareWorkersAdapter(handler),
};
