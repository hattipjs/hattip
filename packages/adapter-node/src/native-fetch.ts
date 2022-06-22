// eslint-disable-next-line import/no-unresolved
import { TransformStream } from "stream/web";

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
