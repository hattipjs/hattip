// @ts-check
import fastlyAdapter from "@hattip/adapter-fastly";
import handler from "../../index.js";
import { getServer } from "./statics.js";
const staticContentServer = getServer();

export default fastlyAdapter(async (ctx) => {
	const response = await staticContentServer.serveRequest(ctx.request);
	if (response != null) {
		return response;
	}

	return handler(ctx);
});
