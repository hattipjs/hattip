import fs from "node:fs";

run().catch((error) => {
	console.error(error);
	process.exit(1);
});

async function run() {
	fs.promises.writeFile("dist/deno/package.json", "{}");
}
