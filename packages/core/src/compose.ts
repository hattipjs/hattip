import type { Handler, Context } from "./types";

/**
 * Compose multiple handlers into a single handler.
 */
export function compose(...handlers: Handler[]): Handler {
  let next: () => Promise<Response> | Response;

  const composed = handlers.reduceRight(
    (prev, current) => async (request, context) => {
      const result = await runHandlerInSequence(
        request,
        context,
        current,
        prev as any,
      );

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

/**
 * Run a kandler taking care of errors and toResponse.
 */
export async function runHandler(
  handler: Handler,
  request: Request,
  context: Context,
): Promise<Response | null> {
  try {
    const response = handler(request, context);

    if (response && "toResponse" in response) {
      return response.toResponse();
    }

    return response as Response | null;
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    } else if ("toResponse" in error) {
      return error.toResponse();
    } else if (context.handleError) {
      return context.handleError(error);
    } else {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}

async function runHandlerInSequence(
  request: Request,
  context: Context,
  handler: Handler,
  next: (request: Request, context: Context) => Promise<Response> | Response,
) {
  context.next = async () => next(request, context);
  return runHandler(handler, request, context);
}
