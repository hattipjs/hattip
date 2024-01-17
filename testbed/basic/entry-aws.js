// @ts-check
import awsLambdaAdapter from "@hattip/adapter-aws-lambda/streaming";
import hattipHandler from "./index.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const staticMiddleware = createStaticMiddleware(files, createFileReader(root), {
	gzip: true,
});

export const handler = awsLambdaAdapter((ctx) => {
	return staticMiddleware(ctx) || hattipHandler(ctx);
});
