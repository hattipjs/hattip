/**
 * Request context as dispatched by the platform adapter
 */
export interface AdapterRequestContext<P = unknown> {
  /**
   * The request. @see https://developer.mozilla.org/en-US/docs/Web/API/Request
   */
  request: Request;
  /**
   * IP address that generated the request. Check with the platform adapter
   * documentation to understand how it is generated.
   */
  ip: string;
  /**
   * Platform specific stuff. Check with the platform adapter documentation for
   * more information.
   */
  platform: P;
  /**
   * Signal that the request hasn't been handled and the returned response is
   * a placeholder (usually a 404). In this case the adapter should handle the
   * request itself if it has a way to do that. For example, an Express
   * middleware adapter may call next() to let the next middleware handle the
   * request. An edge adapter may pass through the request to the origin
   * server. Other adapters may return the placeholder and ignore this call.
   */
  passThrough(): void;
  /**
   * Some platforms (e.g. Cloudflare Workers) require this to be called to
   * keep running after the response is returned when streaming responses.
   * This is a no-op if the platform adapter doesn't need to do anything.
   */
  waitUntil(promise: Promise<any>): void;
}

/**
 * Main handler that adapters expect.
 *
 * @returns A response or a promise that resolves to a response.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
export type HattipHandler = (
  context: AdapterRequestContext,
) => Response | Promise<Response>;
