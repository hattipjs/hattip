import { bench } from "vitest";
import { compose, composeOld } from ".";
import { createTestClient } from "@hattip/adapter-test";
import { RequestHandler } from "../dist";

async function runBench(compose: typeof composeOld) {
	const handlers = Array.from({ length: 100 }, (_, i) => i + 1).map(
		makeHandler,
	);

	const composed = compose(handlers);

	const fetch = createTestClient({
		handler: composed,
		baseUrl: "http://example.com",
	});

	const r1 = await fetch("/99").then((r) => r.text());
	console.assert(r1 === "99");
}

bench("compose", async () => {
	await runBench(compose);
});

bench("compose old", async () => {
	await runBench(composeOld);
});

function makeHandler(n: number): RequestHandler {
	return (ctx) =>
		ctx.url.pathname == `/${n}` ? new Response(`${n}`) : undefined;
}
