// eslint-disable-next-line import/no-unresolved
import * as webStream from "stream/web";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";
import installCrypto from "@hattip/polyfills/crypto";

installGetSetCookie();
installCrypto();

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
