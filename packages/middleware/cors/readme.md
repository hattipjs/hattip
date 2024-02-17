# `@hattip/cors`

[Cross-Origin Resource Sharing(CORS)](https://developer.mozilla.org/en/docs/Web/HTTP/Access_control_CORS) middleware for Hattip.

## Options

```js
export interface CorsOptions {
  /** `Access-Control-Allow-Origin`, default is request Origin header  */
  origin?:
    | string
    | ((ctx: RequestContext) => string | false | Promise<string | false>);
  /** `Access-Control-Allow-Methods`, default is 'GET,HEAD,PUT,POST,DELETE,PATCH'  */
  allowMethods?: string | string[] | null;
  /** `Access-Control-Expose-Headers`  */
  exposeHeaders?: string | string[];
  /** `Access-Control-Allow-Headers`  */
  allowHeaders?: string | string[];
  /** `Access-Control-Max-Age` in seconds  */
  maxAge?: string | number;
  /** `Access-Control-Allow-Credentials`  */
  credentials?: boolean | ((ctx: RequestContext) => boolean | Promise<boolean>);
  /**
   * `Cross-Origin-Opener-Policy` & `Cross-Origin-Embedder-Policy` headers.',
   * default is false
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes
   */
  secureContext?: boolean;
  /**
   * Handle `Access-Control-Request-Private-Network` request by return `Access-Control-Allow-Private-Network`, default to false
   * @see https://wicg.github.io/private-network-access/
   */
  privateNetworkAccess?: boolean;
}
```

## License

- This is a port of [koajs/cors](https://github.com/koajs/cors) by koajs and contributors under the [MIT License](./koajs-cors-license.txt). They are not affiliated with Hattip.
- Hattip port by [Fatih Aygün](https://github.com/cyco130) under the [MIT License](./LICENSE).
