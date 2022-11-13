// @ts-check
import adapterVercel from "@hattip/adapter-vercel-edge";
import { compose } from "@hattip/compose";
import { createRouter } from "@hattip/router";

const router = createRouter();

router.get("/edge", (ctx) => {
	return new Response("Hello from edge!");
});

router.get("/pass", (ctx) => {
	const response = new Response();
	response.headers.set("x-set-by-middleware", "1");
	ctx.passThrough();

	return response;
});

export default adapterVercel(compose(router.handlers));
