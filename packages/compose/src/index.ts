import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

export interface RequestContext extends AdapterRequestContext {
  next(): Promise<Response>;
  handleError(error: unknown): Response | Promise<Response>;
}

export interface ResponseConvertible {
  toResponse(): Response | Promise<Response>;
}

export type ResponseLike = Response | ResponseConvertible;

export type MaybeRespone = ResponseLike | undefined;

export type MaybeAsyncResponse = MaybeRespone | Promise<MaybeRespone>;

export type RequestHandler = (context: RequestContext) => MaybeAsyncResponse;

export type MaybeRequestHandler = false | null | undefined | RequestHandler;

export type RequestHandlerStack = MaybeRequestHandler | RequestHandlerStack[];

function finalHandler(context: RequestContext): Response {
  context.passThrough();
  return new Response("Not found", { status: 404 });
}

export function compose(...handlers: RequestHandlerStack[]): HattipHandler {
  const flatHandlers = handlers.flat().filter(Boolean) as RequestHandler[];

  return flatHandlers.map(wrap).reduceRight((prev, current) => {
    return async (context: RequestContext) => {
      context.next = () => prev(context) as any;
      const result = await current(context);
      return result || prev(context);
    };
  }, finalHandler) as any;
}

function wrap(
  handler: RequestHandler,
): (
  context: RequestContext,
) => Response | undefined | Promise<Response | undefined> {
  return async (context: RequestContext) => {
    let result: Response | ResponseConvertible;
    try {
      result = (await (handler(context) || context.next()))!;
    } catch (error) {
      if (error instanceof Response) {
        return error;
      } else if (isResponseConvertible(error)) {
        return error.toResponse();
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
