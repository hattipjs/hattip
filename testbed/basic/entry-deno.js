import { serve, serveDir, createRequestHandler } from "@hattip/adapter-deno";
import hattipHandler from "./index.js";

const handler = createRequestHandler(hattipHandler);

serve(
	async (request, connInfo) => {
		const staticResponse = await serveDir(request, { fsRoot: "./public" });

		if (staticResponse.status !== 404) {
			return staticResponse;
		}

		return handler(request, connInfo);
	},
	{ port: 3000 },
);
