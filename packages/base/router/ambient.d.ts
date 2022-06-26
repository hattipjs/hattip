import "@hattip/compose";

declare module "@hattip/compose" {
  interface RequestContext {
    url: URL;
    method: string;
    params: any;
  }
}
