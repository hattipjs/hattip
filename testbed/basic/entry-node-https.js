// @ts-check
import { createServer } from "node:https";
import connect from "connect";
import { createMiddleware } from "@hattip/adapter-node/native-fetch";
import handler from "./index.js";
import sirv from "sirv";
import { createCA, createCert } from "mkcert";

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

const app = connect();

app.use(sirv("public"));
app.use(createMiddleware(handler));

createServer(
	{
		key: cert.key,
		cert: cert.cert,
		ca: ca.cert,
	},
	app,
).listen(3000, "127.0.0.1", () => {
	console.log("Server listening on https://127.0.0.1:3000");
});
