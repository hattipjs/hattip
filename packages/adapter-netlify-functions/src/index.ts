/// <reference types='node'/>

import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type {
  NetlifyFunction,
  NetlifyFunctionEvent,
  NetlifyFunctionContext,
} from "netlify-lambda-types";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";

installNodeFetch();
installGetSetCookie();

export interface NetlifyFunctionsPlatformInfo {
  event: NetlifyFunctionEvent;
  context: NetlifyFunctionContext;
}

export type { NetlifyFunctionEvent, NetlifyFunctionContext };

export default function netlifyFunctionsAdapter(
  handler: HattipHandler,
): NetlifyFunction {
  return async (event, netlifyContext) => {
    if (event.path === "/net") {
      return {
        statusCode: 200,
        body: JSON.stringify(event, null, 2),
      };
    }

    const clientConnectionIp = event.headers["x-nf-client-connection-ip"];

    const context: AdapterRequestContext<NetlifyFunctionsPlatformInfo> = {
      request: new Request(
        (clientConnectionIp ? "https://" : "http://") +
          event.headers.host +
          event.path,
        {
          method: event.httpMethod,

          body:
            event.httpMethod === "GET" || event.httpMethod === "HEAD"
              ? undefined
              : event.isBase64Encoded
              ? Buffer.from(event.body, "base64")
              : event.body,

          headers: event.headers,
        },
      ),

      ip: clientConnectionIp || event.headers["client-ip"],

      waitUntil(promise) {
        // Do nothing
        void promise;
      },

      passThrough() {
        // Do nothing
      },

      platform: {
        event,
        context: netlifyContext,
      },
    };

    const response = await handler(context);

    const headers: Record<string, string> = {};
    const multiValueHeaders: Record<string, string[]> = {};

    for (const [key, value] of response.headers) {
      if (key === "set-cookie") {
        multiValueHeaders[key] = response.headers.getSetCookie();
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
