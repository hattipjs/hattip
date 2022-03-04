export type Handler = (
  request: Request,
  context: Context,
) => undefined | Response | Promise<undefined | Response>;

export interface Context {
  ip: string;
  waitUntil(promise: Promise<any>): void;
}
