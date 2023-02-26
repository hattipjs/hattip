// @ts-check
import { createServer } from "@hattip/adapter-uwebsockets";
import handler from "./index.js";

createServer(handler, {
	staticDir: "./public",
}).listen(3000, (success) => {
	if (!success) {
		console.error("Failed to listen on port 3000");
		process.exit(1);
	}

	console.log("Server listening on http://127.0.0.1:3000");
});
