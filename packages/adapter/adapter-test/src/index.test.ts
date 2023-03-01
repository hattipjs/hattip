import { HattipHandler } from "@hattip/core";
import { test } from "vitest";
import { createTestClient } from ".";

const handler: HattipHandler = (context) => {
	const { pathname } = new URL(context.request.url);
	if (pathname === "/") {
		return new Response("Hello from HatTip.");
	} else if (pathname === "/about") {
		return new Response(
			"This HTTP handler works in Node.js and Cloudflare Workers.",
		);
	} else {
		return new Response("Not found.", { status: 404 });
	}
};

test("return response", async ({ expect }) => {
	const fetch = createTestClient({
		handler,
		baseUrl: "https://example.com",
	});

	const rootEndpointResp = await fetch("/");
	expect(rootEndpointResp.status).toEqual(200);
	expect(await rootEndpointResp.text()).toEqual("Hello from HatTip.");

	const aboutEndpointResp = await fetch("/about");
	expect(aboutEndpointResp.status).toEqual(200);
	expect(await aboutEndpointResp.text()).toEqual(
		"This HTTP handler works in Node.js and Cloudflare Workers.",
	);

	const unknownEndpointResp = await fetch("/unknown-path");
	expect(unknownEndpointResp.status).toEqual(404);
	expect(await unknownEndpointResp.text()).toEqual("Not found.");
});
