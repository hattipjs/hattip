import cloudflareWorkersAdapter from "./dist/index.mjs";
import handler from "virtual:hattip:handler-entry";

export default {
  fetch: cloudflareWorkersAdapter(handler),
};
