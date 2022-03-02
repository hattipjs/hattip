import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./entry-hattip";

export default {
	fetch: cloudflareWorkersAdapter(handler),
};
