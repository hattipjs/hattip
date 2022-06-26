import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

/**
 * Request context
 */
export interface RequestContext extends AdapterRequestContext {
  /** Call the next handler in the chain */
  next(): Promise<Response>;
  /** Redefine to handle errors by generating a response from an error */
  handleError(error: unknown): Response | Promise<Response>;
}

export interface ResponseConvertible {
  toResponse(): Response | Promise<Response>;
}

export type ResponseLike = Response | ResponseConvertible;

export type MaybeRespone = ResponseLike | void;

export type MaybeAsyncResponse = MaybeRespone | Promise<MaybeRespone>;

export type RequestHandler = (context: RequestContext) => MaybeAsyncResponse;

export type MaybeRequestHandler = false | null | undefined | RequestHandler;

export type RequestHandlerStack = MaybeRequestHandler | RequestHandlerStack[];

function finalHandler(context: RequestContext): Response {
  context.passThrough();
  return new Response("Not found", { status: 404 });
}

export type PartialHandler = (
  context: RequestContext,
) => Response | void | Promise<Response | void>;

export function composePartial(
  handlers: RequestHandlerStack[],
  next?: () => Promise<Response>,
): PartialHandler {
  const flatHandlers = handlers.flat().filter(Boolean) as RequestHandler[];
  flatHandlers.unshift((context) => {
    context.handleError = (error: unknown) => {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    };
  });

  return flatHandlers.map(wrap).reduceRight(
    (prev, current) => {
      return async (context: RequestContext) => {
        context.next = () => prev(context) as any;
        const result = await current(context);
        return result || prev(context);
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next ? (_: RequestContext) => next() : (_: RequestContext) => undefined,
  );
}

export function compose(...handlers: RequestHandlerStack[]): HattipHandler {
  return composePartial([...handlers, finalHandler]) as any;
}

function wrap(
  handler: RequestHandler,
): (context: RequestContext) => Response | void | Promise<Response | void> {
  return async (context: RequestContext) => {
    let result: Response | ResponseConvertible;
    try {
      result = (await (handler(context) || context.next()))!;
    } catch (error) {
      if (error instanceof Response) {
        return error;
      } else if (isResponseConvertible(error)) {
        return error.toResponse();
      } else if (context.handleError) {
        return context.handleError(error);
      } else {
        throw error;
      }
    }

    if (isResponseConvertible(result)) {
      return result.toResponse();
    }

    return result;
  };
}

function isResponseConvertible(response: any): response is ResponseConvertible {
  return response && "toResponse" in response;
}
