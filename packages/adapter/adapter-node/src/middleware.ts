import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import process from "node:process";
import { createRequestAdapter } from "./request";
import { sendResponse } from "./response";
import { NodeMiddleware, NodePlatformInfo } from "./types/common";
import { IncomingMessage, NodeAdapterOptions, ServerResponse } from "./types";
import type * as http from "./types/http";

/**
 * Creates a request handler to be passed to http.createServer() or used as a
 * middleware in Connect-style frameworks like Express.
 */
export function createMiddleware<
	NodeRequest extends IncomingMessage = http.IncomingMessage,
	NodeResponse extends ServerResponse = http.ServerResponse,
>(
	handler: HattipHandler<NodePlatformInfo<NodeRequest, NodeResponse>>,
	options: NodeAdapterOptions = {},
): NodeMiddleware<NodeRequest, NodeResponse> {
	const { alwaysCallNext = true, ...requestOptions } = options;

	const requestAdapter = createRequestAdapter(requestOptions);

	return async (req, res, next) => {
		try {
			const [request, ip] = requestAdapter(req, res);

			let passThroughCalled = false;

			const context: AdapterRequestContext<
				NodePlatformInfo<NodeRequest, NodeResponse>
			> = {
				request,

				ip,

				env(variable) {
					return process.env[variable];
				},

				waitUntil(promise) {
					// Do nothing
					void promise;
				},

				passThrough() {
					passThroughCalled = true;
				},

				platform: {
					name: "node",
					request: req,
					response: res,
				},
			};

			const response = await handler(context);

			if (passThroughCalled && next) {
				next();
				return;
			}

			await sendResponse(req, res, response);

			if (next && alwaysCallNext) {
				next();
			}
		} catch (error) {
			if (next) {
				next(error);
			} else {
				console.error(error);

				if (!res.headersSent) {
					res.statusCode = 500;
				}

				if (!res.writableEnded) {
					res.end();
				}
			}
		}
	};
}
