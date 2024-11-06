import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";
import process from "node:process";
import { Buffer } from "node:buffer";
import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { streamifyResponse, ResponseStream } from "lambda-stream";
import { Readable } from "node:stream";

installNodeFetch();
installGetSetCookie();
installCrypto();

export interface AwsLambdaPlatformInfo {
	name: "aws-lambda-streaming";
	event: APIGatewayProxyEventV2;
	responseStream: ResponseStream;
	context?: Context;
}

export default function awsLambdaAdapter(
	handler: HattipHandler<AwsLambdaPlatformInfo>,
) {
	return streamifyResponse(
		async (
			event: APIGatewayProxyEventV2,
			responseStream: ResponseStream,
			context,
		) => {
			const ip =
				event.headers["x-forwarded-for"] ||
				event.requestContext.http.sourceIp ||
				"";

			const origin =
				process.env.ORIGIN || "https://" + event.requestContext.domainName;

			const url =
				origin +
				event.rawPath +
				(event.rawQueryString ? "?" + event.rawQueryString : "");

			const ctx: AdapterRequestContext<AwsLambdaPlatformInfo> = {
				request: new Request(url, {
					method: event.requestContext?.http?.method || "GET",

					body:
						!event.body ||
						event.requestContext.http.method === "GET" ||
						event.requestContext.http.method === "HEAD"
							? undefined
							: event.isBase64Encoded
								? Buffer.from(event.body, "base64")
								: event.body,

					headers: event.headers as Record<string, string>,
				}),

				ip,

				waitUntil(promise) {
					// Do nothing
					void promise;
				},

				passThrough() {
					// Do nothing
				},

				platform: {
					name: "aws-lambda-streaming",
					event,
					responseStream,
					context,
				},

				env(variable) {
					return process.env[variable];
				},
			};

			const response = await handler(ctx);

			const headers: Record<string, string> = {};
			let cookies: string[] | undefined = [];

			const uniqueHeaderNames = new Set(response.headers.keys());

			for (const key of uniqueHeaderNames) {
				if (key === "set-cookie") {
					const setCookie = response.headers.getSetCookie!();
					cookies = setCookie;
				} else {
					headers[key] = response.headers.get(key)!;
				}
			}

			// @ts-expect-error: awslambda type is nowhere to be found :/
			responseStream = awslambda.HttpResponseStream.from(responseStream, {
				statusCode: response.status,
				headers,
				cookies,
			});

			if (response.body) {
				const readable = Readable.fromWeb(response.body as any);
				readable.pipe(responseStream);
			} else {
				// Lambda always seems to return 200 if we don't call write first
				responseStream.write("");
				responseStream.end();
			}

			await new Promise((resolve, reject) => {
				responseStream.on("finish", resolve);
				responseStream.on("error", reject);
				// This never seems to fire
				// responseStream.on("close", () => {});
			});
		},
	);
}
