import * as nodeFetch from "node-fetch-native";
import { Readable } from "stream";

export default function install() {
  globalThis.fetch = globalThis.fetch ?? nodeFetch.default;
  globalThis.AbortController =
    globalThis.AbortController ?? nodeFetch.AbortController;
  globalThis.Blob = globalThis.Blob ?? nodeFetch.Blob;
  globalThis.File = globalThis.File ?? nodeFetch.File;
  globalThis.FormData = globalThis.FormData ?? nodeFetch.FormData;
  globalThis.Headers = globalThis.Headers ?? nodeFetch.Headers;
  globalThis.Request = globalThis.Request ?? nodeFetch.Request;

  if (globalThis.Response) return;

  // node-fetch doesn't allow constructing a Request from ReadableStream
  // see: https://github.com/node-fetch/node-fetch/issues/1096
  class Response extends nodeFetch.Response {
    constructor(input: BodyInit, init?: ResponseInit) {
      if (input instanceof ReadableStream) {
        input = Readable.from(input as any) as any;
      }

      super(input as any, init);
    }
  }

  globalThis.Response = Response as any;
}
