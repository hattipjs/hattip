import cloudflareWorkersAdapter from "@hattip/adapter-cloudflare-workers";
import handler from "./src/entry-hattip.js";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
