import "@hattip/core";

declare module "@hattip/core" {
  interface Context {
    url: URL;
    params: any;
  }
}
