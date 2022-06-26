import type {} from "@hattip/core";

const SET_COOKIE = Symbol("set-cookie");

declare global {
  interface Headers {
    [SET_COOKIE]?: string[];
    raw?(): Record<string, string | string[]>;
    getAll?(name: string): string[];
  }
}

export default function install() {
  if (typeof globalThis.Headers.prototype.getSetCookie === "function") {
    return;
  }

  if (typeof globalThis.Headers.prototype.getAll === "function") {
    globalThis.Headers.prototype.getSetCookie = function () {
      return this.getAll!("Set-Cookie");
    };

    return;
  }

  if (typeof globalThis.Headers.prototype.raw === "function") {
    globalThis.Headers.prototype.getSetCookie = function () {
      const setCookie = this.raw!()["set-cookie"];
      if (!setCookie) {
        return [];
      } else if (typeof setCookie === "string") {
        return [setCookie];
      }

      return setCookie;
    };

    return;
  }

  globalThis.Headers.prototype.getSetCookie = function getSetCookie() {
    return this[SET_COOKIE] || [];
  };

  const originalAppend = globalThis.Headers.prototype.append;
  globalThis.Headers.prototype.append = function append(
    name: string,
    value: string,
  ) {
    if (name.toLowerCase() === "set-cookie") {
      if (!this[SET_COOKIE]) {
        this[SET_COOKIE] = [];
      }

      this[SET_COOKIE].push(value);
    }

    return originalAppend.call(this, name, value);
  };

  const originalDelete = globalThis.Headers.prototype.delete;
  globalThis.Headers.prototype.delete = function deleteHeader(name: string) {
    if (name.toLowerCase() === "set-cookie") {
      this[SET_COOKIE] = [];
    }

    return originalDelete.call(this, name);
  };

  const originalSet = globalThis.Headers.prototype.set;
  globalThis.Headers.prototype.set = function setHeader(
    name: string,
    value: string,
  ) {
    if (name.toLowerCase() === "set-cookie") {
      this[SET_COOKIE] = [value];
    }

    return originalSet.call(this, name, value);
  };

  const Headers = class extends globalThis.Headers {
    constructor(init?: HeadersInit) {
      super(init);
      if (!init) {
        return;
      }
      if (init instanceof Headers || init instanceof Headers) {
        this[SET_COOKIE] = init[SET_COOKIE];
      } else if (Array.isArray(init)) {
        this[SET_COOKIE] = init
          .filter(([key]) => key.toLowerCase() === "set-cookie")
          .map(([, value]) => value);
      } else {
        this[SET_COOKIE] = [];
        for (const [key, value] of Object.entries(init)) {
          if (key.toLowerCase() === "set-cookie") {
            if (typeof value === "string") {
              this[SET_COOKIE]!.push(value);
            } else if (Array.isArray(value)) {
              this[SET_COOKIE]!.push(...(value as string[]));
            }
          }
        }
      }
    }
  };

  const Response = class extends globalThis.Response {
    constructor(body: any, init?: ResponseInit) {
      super(body, init);
      if (init && init.headers) {
        this.headers[SET_COOKIE] = new Headers(init.headers)[SET_COOKIE];
      }
    }
  };

  globalThis.Headers = Headers;
  globalThis.Response = Response;
}
