import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type {
	NetlifyFunction,
	NetlifyFunctionEvent,
	NetlifyFunctionContext,
} from "netlify-lambda-types";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";
import process from "node:process";
import { Buffer } from "node:buffer";

installNodeFetch();
installGetSetCookie();
installCrypto();

export interface NetlifyFunctionsPlatformInfo {
	name: "netlify-functions";
	event: NetlifyFunctionEvent;
	context: NetlifyFunctionContext;
}

export type { NetlifyFunctionEvent, NetlifyFunctionContext };

export default function netlifyFunctionsAdapter(
	handler: HattipHandler<NetlifyFunctionsPlatformInfo>,
): NetlifyFunction {
	return async (event, netlifyContext) => {
		const ip =
			event.headers["x-nf-client-connection-ip"] ||
			event.headers["client-ip"] ||
			"";

		const context: AdapterRequestContext<NetlifyFunctionsPlatformInfo> = {
			request: new Request((event as any).rawUrl, {
				method: event.httpMethod,

				body:
					!event.body ||
					event.httpMethod === "GET" ||
					event.httpMethod === "HEAD"
						? undefined
						: event.isBase64Encoded
						? Buffer.from(event.body, "base64")
						: event.body,

				headers: event.headers,
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
				name: "netlify-functions",
				event,
				context: netlifyContext,
			},

			env(variable) {
				return process.env[variable];
			},
		};

		const response = await handler(context);

		const headers: Record<string, string> = {};
		const multiValueHeaders: Record<string, string[]> = {};

		for (const [key, value] of response.headers) {
			if (key === "set-cookie") {
				multiValueHeaders[key] = response.headers.getSetCookie!();
			} else {
				headers[key] = value;
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

		return {
			statusCode: response.status || 200,
			headers,
			multiValueHeaders,
			body,
			isBase64Encoded,
		};
	};
}
