import type { Handler, Context } from "./types";

async function runHandler(
  request: Request,
  context: Context,
  handler: Handler,
  next: (request: Request, context: Context) => Promise<Response> | Response,
) {
  context.next = async () => next(request, context);
  return handler(request, context);
}

export function compose(...handlers: Handler[]): Handler {
  let next: () => Promise<Response> | Response;

  const composed = handlers.reduceRight(
    (prev, current) => async (request, context) => {
      const result = await runHandler(request, context, current, prev as any);
      if (result) {
        return result;
      }
      return context.next();
    },
    async () => next(),
  );

  return async (request, context) => {
    next = context.next;
    return composed(request, context);
  };
}
