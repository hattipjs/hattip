// @ts-check
import { createServer } from "@hattip/adapter-uwebsockets/native-fetch";
import { walk } from "@hattip/walk";
import handler from "./index.js";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";
import { createCA, createCert } from "mkcert";
import fs from "node:fs";

const ca = await createCA({
	organization: "Hattip",
	countryCode: "PT",
	state: "Lisbon",
	locality: "Lisbon",
	validity: 365,
});

const cert = await createCert({
	ca: { key: ca.key, cert: ca.cert },
	domains: ["127.0.0.1", "localhost"],
	validity: 365,
});

// Write certificate files to disk
fs.mkdirSync("node_modules/.cert", { recursive: true });
fs.writeFileSync("node_modules/.cert/cert.pem", cert.cert);
fs.writeFileSync("node_modules/.cert/key.pem", cert.key);

const root = new URL("./public", import.meta.url);
const files = walk(root);
const reader = createFileReader(root);
const staticMiddleware = createStaticMiddleware(files, reader);

createServer(
	(ctx) => staticMiddleware(ctx) || handler(ctx),
	{ ssl: true },
	{
		key_file_name: "node_modules/.cert/key.pem",
		cert_file_name: "node_modules/.cert/cert.pem",
	},
).listen(3000, (success) => {
	if (!success) {
		console.error("Failed to listen on port 3000");
		process.exit(1);
	}

	console.log("Server listening on https://127.0.0.1:3000");
});
