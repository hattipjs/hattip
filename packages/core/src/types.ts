/**
 * Request handler
 */
export type Handler = (
  request: Request,
  context: Context,
) =>
  | Response
  | ResponseConvertible
  | null
  | Promise<Response | ResponseConvertible | null>;

/**
 * Request context
 */
export interface Context {
  /**
   * IP address that generated the request.
   * Check with the platform adapter documentation to understand how it is determined.
   */
  ip: string;
  /**
   * Some platforms (e.g. Cloudflare Workers) requires this to be called to keep running
   * after the response is returned when streaming responses.
   */
  waitUntil(promise: Promise<any>): void;
  /**
   * Calls the next handler in the chain.
   */
  next(): Promise<Response>;
  /**
   * Handle errors thrown by the handler.
   */
  handleError?(error: unknown): Response | Promise<Response>;
  /**
   * Whether the default 404 handler has been called.
   */
  isNotFound?: boolean;
}

export interface ResponseConvertible {
  toResponse(): Response | Promise<Response>;
}
