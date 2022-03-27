export type Handler = (
  request: Request,
  context: Context,
) => Response | null | Promise<Response | null>;

export interface Context {
  ip: string;
  waitUntil(promise: Promise<any>): void;
  next(): Promise<Response>;
}
