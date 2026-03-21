import { app } from "./hono-common.ts";

export default {
	port: 3000,
	fetch: app.fetch,
};
