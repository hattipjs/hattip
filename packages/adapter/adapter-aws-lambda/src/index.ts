import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";
import process from "node:process";
import { Buffer } from "node:buffer";
import {
	APIGatewayProxyEventV2,
	APIGatewayProxyStructuredResultV2,
	Context,
} from "aws-lambda";

installNodeFetch();
installGetSetCookie();
installCrypto();

export interface AwsLambdaPlatformInfo {
	name: "aws-lambda";
	event: APIGatewayProxyEventV2;
	context: Context;
}

export default function awsLambdaAdapter(
	handler: HattipHandler<AwsLambdaPlatformInfo>,
) {
	return async (event: APIGatewayProxyEventV2, context: Context) => {
		const ip =
			event.requestContext.http.sourceIp ||
			event.headers["x-forwarded-for"] ||
			"";

		const origin =
			process.env.ORIGIN || "https://" + event.requestContext.domainName;

		const url =
			origin +
			event.rawPath +
			(event.rawQueryString ? "?" + event.rawQueryString : "");

		if (
			typeof event.headers.cookie === "undefined" &&
			event.cookies != null &&
			event.cookies.length > 0
		) {
			event.headers["cookie"] = event.cookies.join("; ");
		}

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
				name: "aws-lambda",
				event,
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

		const resBody = response.body;
		let body: string;
		let isBase64Encoded = false;

		if (!resBody) {
			body = "";
		} else if (typeof resBody === "string") {
			body = resBody;
		} else if (resBody instanceof Uint8Array) {
			body = Buffer.from(resBody).toString("base64");
			isBase64Encoded = true;
		} else {
			const chunks: string[] | Buffer[] = [];

			for await (const chunk of resBody as any) {
				if (typeof chunk === "string") {
					chunks.push(chunk as any);
				} else {
					chunks.push(chunk as any);
				}
			}

			switch (typeof chunks[0]) {
				case "undefined":
					body = "";
					break;

				case "string":
					body = chunks.join("");
					break;

				default:
					body = Buffer.concat(chunks as Buffer[]).toString("base64");
					isBase64Encoded = true;
					break;
			}
		}

		const result: APIGatewayProxyStructuredResultV2 = {
			statusCode: response.status,
			headers,
			cookies,
			body,
			isBase64Encoded,
		};

		return result;
	};
}
