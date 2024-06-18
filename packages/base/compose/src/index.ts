import type { AdapterRequestContext, HattipHandler } from "@hattip/core";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RequestContextExtensions {}

/** App-local stuff */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Locals {}

/**
 * Request context
 */
export interface RequestContext<P = unknown>
	extends AdapterRequestContext<P>,
		RequestContextExtensions {
	/** Parsed request URL */
	url: URL;
	/** Request method */
	method: string;
	/** App-local stuff */
	locals: Locals;
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

export type RequestHandler<P = unknown> = (
	context: RequestContext<P>,
) => MaybeAsyncResponse;

export type MaybeRequestHandler<P = unknown> =
	| false
	| null
	| undefined
	| RequestHandler<P>;

export type RequestHandlerStack<P = unknown> =
	| MaybeRequestHandler<P>
	| MaybeRequestHandler<P>[];

function finalHandler(context: RequestContext): Response {
	context.passThrough();
	return new Response("Not found", { status: 404 });
}

export type PartialHandler<P = unknown> = (
	context: RequestContext<P>,
) => Response | void | Promise<Response | void>;

export function composePartialOld<P = unknown>(
	handlers: RequestHandlerStack<P>[],
	next?: () => Promise<Response>,
): PartialHandler {
	const flatHandlers = handlers.flat().filter(Boolean) as RequestHandler[];

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

export function compose<P = unknown>(
	...handlers: RequestHandlerStack<P>[]
): HattipHandler<P> {
	return composePartial<P>([
		(context) => {
			context.url = new URL(context.request.url);
			context.method = context.request.method;
			context.locals = {};

			context.handleError = (error: unknown) => {
				console.error(error);
				return new Response("Internal Server Error", { status: 500 });
			};
		},
		...handlers,
		finalHandler,
	]) as any;
}

export function composeOld<P = unknown>(
	...handlers: RequestHandlerStack<P>[]
): HattipHandler<P> {
	return composePartialOld<P>([
		(context) => {
			context.url = new URL(context.request.url);
			context.method = context.request.method;
			context.locals = {};

			context.handleError = (error: unknown) => {
				console.error(error);
				return new Response("Internal Server Error", { status: 500 });
			};
		},
		...handlers,
		finalHandler,
	]) as any;
}

export function composePartial<P = unknown>(
	handlers: RequestHandlerStack<P>[],
): PartialHandler<P> {
	const flatHandlers = handlers.flat().filter(Boolean) as RequestHandler[];

	async function call(ctx: RequestContext<P>, start = 0): Promise<Response> {
		const next = ctx.next;

		let ref = 0;
		ctx.next = () => call(ctx, ref + 1);

		for (let i = start; i < flatHandlers.length; i++) {
			const handler = flatHandlers[i];
			ref = i;

			try {
				let response = handler(ctx);
				if (response instanceof Promise) {
					response = await response;
				}

				if (response) {
					return toResponse(response);
				}
			} catch (error) {
				if (error instanceof Response) {
					return error;
				}

				if (isResponseConvertible(error)) {
					return error.toResponse();
				}

				if (ctx.handleError) {
					return ctx.handleError(error);
				}

				throw error;
			}
		}

		return next();
	}

	return (ctx) => call(ctx);
}

function toResponse(responseLike: ResponseLike): Response | Promise<Response> {
	if (responseLike instanceof Response) {
		return Promise.resolve(responseLike);
	}

	return responseLike.toResponse();
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
