import type { AdapterRequestContext, HattipHandler } from "@hattip/core";
import type {
  NetlifyFunction,
  NetlifyFunctionEvent,
  NetlifyFunctionContext,
} from "netlify-lambda-types";
import { installNodeFetch } from "@hattip/adapter-node";

export interface NetlifyFunctionsPlatformInfo {
  event: NetlifyFunctionEvent;
  context: NetlifyFunctionContext;
}

export type { NetlifyFunctionEvent, NetlifyFunctionContext };

const installPromise = installNodeFetch();

export default function netlifyFunctionsAdapter(
  handler: HattipHandler,
): NetlifyFunction {
  return async (event, netlifyContext) => {
    await installPromise;

    const context: AdapterRequestContext<NetlifyFunctionsPlatformInfo> = {
      request: new Request("https://" + event.headers.host + event.path, {
        method: event.httpMethod,

        body:
          event.httpMethod === "GET" || event.httpMethod === "HEAD"
            ? undefined
            : event.isBase64Encoded
            ? Buffer.from(event.body, "base64")
            : event.body,
      }),

      ip: event.headers["x-nf-client-connection-ip"],

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
    const rawHeaders: Record<string, string | string[]> = (
      response.headers as any
    ).raw();

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (Array.isArray(value)) {
        multiValueHeaders[key] = value;
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
