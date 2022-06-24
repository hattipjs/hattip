// eslint-disable-next-line import/no-unresolved
import { TransformStream } from "stream/web";
import installGetSetCookie from "@hattip/polyfills/get-set-cookie";

installGetSetCookie();

if (!global.TransformStream) {
  global.TransformStream = TransformStream as any;
}

export type {
  DecoratedRequest,
  NodeMiddleware,
  NodeAdapterOptions,
  NodePlatformInfo,
} from "./common";

export { createMiddleware, createServer } from "./common";
