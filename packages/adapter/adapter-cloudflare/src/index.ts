/* eslint-disable @typescript-eslint/ban-ts-comment */
import { RequestContext, type HattipHandler } from "@hattip/core";

// @ts-ignore: No type
type GlobalRequest = Request;
// @ts-ignore: No type
type GlobalResponse = Response;

interface DefaultExportedHandler {
	fetch?: (
		request: GlobalRequest,
		env: unknown,
		ctx: {
			waitUntil(promise: Promise<any>): void;
			passThroughOnException(): void;
			readonly exports: unknown;
			readonly props: unknown;
		},
	) => GlobalResponse | Promise<GlobalResponse>;
}

interface _ExportedHandler {
	fetch?: (
		request: any,
		env: any,
		ctx: {
			waitUntil(promise: Promise<any>): void;
			passThroughOnException(): void;
			readonly exports: any;
			readonly props: any;
		},
	) => any | Promise<any>;
}

export interface CloudflarePlatform<H extends _ExportedHandler> {
	name: "cloudflare";
	env: Parameters<NonNullable<H["fetch"]>>[1];
	executionContext: Parameters<NonNullable<H["fetch"]>>[2];
}

export class CloudflareRequestContext<
	H extends _ExportedHandler,
> extends RequestContext<CloudflarePlatform<H>> {
	declare request: Parameters<NonNullable<H["fetch"]>>[0];
}

export function createHandler<
	H extends _ExportedHandler = DefaultExportedHandler,
>(
	handler: HattipHandler<CloudflareRequestContext<H>>,
): NonNullable<H["fetch"]> {
	return (request, env, executionContext) => {
		const ctx = new CloudflareRequestContext(
			{
				name: "cloudflare",
				env,
				executionContext,
			},
			request,
		);

		return handler(ctx);
	};
}
