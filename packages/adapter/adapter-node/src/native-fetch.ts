// eslint-disable-next-line import/no-unresolved
import * as webStream from "stream/web";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";

installGetSetCookie();

for (const key of Object.keys(webStream)) {
  if (!(key in global)) {
    (global as any)[key] = (webStream as any)[key];
  }
}

export type {
  DecoratedRequest,
  NodeMiddleware,
  NodeAdapterOptions,
  NodePlatformInfo,
} from "./common";

export { createMiddleware, createServer } from "./common";
