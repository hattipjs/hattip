export type Handler = (
  request: Request,
  context: Context,
) => undefined | Response | Promise<undefined | Response>;

export interface Context {
  waitUntil(promise: Promise<any>): void;
}

export interface Adapter {
  defaultEntry: string;
  bundle?: () => Promise<void>;
}
