// @ts-check
import bunAdapter from "@hattip/adapter-bun";
import handler from ".";
import url from "node:url";
import path from "node:path";

const dir = path.resolve(
	path.dirname(url.fileURLToPath(new URL(import.meta.url))),
	"public",
);

export default bunAdapter(handler, { staticDir: dir });
