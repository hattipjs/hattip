declare module "@hattip/compose" {
	interface RequestContextExtensions {
		/** Dynamic route parameters */
		params: any;
	}
}

import {
	RequestHandler,
	RequestContext,
	MaybeAsyncResponse,
	compose,
} from "@hattip/compose";
import { HattipHandler } from "@hattip/core";

export interface RouterContext<
	Params = Record<string, string>,
	Platform = unknown,
> extends RequestContext<Platform> {
	params: Params;
}

export type RouteFn<Platform = unknown> =
	| (<Params>(
			matcher: Matcher<Platform>,
			handler: RouteHandler<Params, Platform>,
	  ) => void)
	| (<Params>(handler: RouteHandler<Params, Platform>) => void);

export interface Router<Platform = unknown> {
	/** Compose route handlers into a single handler */
	buildHandler(): HattipHandler<Platform>;

	/** Route handlers */
	handlers: RequestHandler<Platform>[];

	use<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	use<P>(handler: RouteHandler<P, Platform>): void;

	delete<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	delete<P>(handler: RouteHandler<P, Platform>): void;

	get<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	get<P>(handler: RouteHandler<P, Platform>): void;

	head<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	head<P>(handler: RouteHandler<P, Platform>): void;

	options<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	options<P>(handler: RouteHandler<P, Platform>): void;

	patch<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	patch<P>(handler: RouteHandler<P, Platform>): void;

	post<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	post<P>(handler: RouteHandler<P, Platform>): void;

	put<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	put<P>(handler: RouteHandler<P, Platform>): void;
}

export type Matcher<P = Record<string, string>, Platform = unknown> =
	| string
	| RegExp
	| ((
			context: RequestContext<Platform>,
	  ) => undefined | P | Promise<undefined | P>);

export type RouteHandler<
	Params = Record<string, string>,
	Platform = unknown,
> = (context: RouterContext<Params, Platform>) => MaybeAsyncResponse;

export function createRouter<Platform = unknown>(): Router<Platform> {
	function createRouteFn(method: string) {
		return function (
			this: Router,
			matcherOrHandler: Matcher | RouteHandler,
			handler?: RouteHandler,
		) {
			let matcher: Matcher;

			if (handler) {
				matcher = matcherOrHandler as Matcher;
			} else {
				matcher = always;
				handler = matcherOrHandler as RouteHandler;
			}

			let fn: (context: RequestContext) => null | any | Promise<null | any>;

			// Adapted from: https://github.com/kwhitley/itty-router/blob/73148972bf2e205a4969e85672e1c0bfbf249c27/src/itty-router.js#L7
			if (typeof matcher === "string") {
				matcher = RegExp(
					`^${matcher
						.replace(/(\/?)\*/g, "($1.*)?")
						.replace(/\/$/, "")
						.replace(/:(\w+)(\?)?(\.)?/g, "$2(?<$1>[^/]+)$2$3")
						.replace(/\.(?=[\w(])/, "\\.")
						.replace(/\)\.\?\(([^[]+)\[\^/g, "?)\\.?($1(?<=\\.)[^\\.")}/*$`,
				);
			}

			if (typeof matcher === "function") {
				fn = matcher;
			} else if (matcher instanceof RegExp) {
				fn = (context) => {
					if (
						method === "use" ||
						context.method === String(method).toUpperCase()
					) {
						const doesMatch = matcher.test(context.url.pathname);
						if (doesMatch) {
							const match = context.url.pathname.match(matcher);
							return match!.groups || {};
						}

						return null;
					}
				};
			} else {
				throw new TypeError("Invalid matcher");
			}

			function route(context: RequestContext<Platform>) {
				const params = fn(context);
				if (!params) {
					return;
				}

				context.params = params;
				return handler!(context);
			}

			this.handlers.push(route as any);
		};
	}

	return {
		handlers: [] as RouteHandler[],

		buildHandler() {
			return compose(this.handlers);
		},

		use: createRouteFn("use") as any,
		delete: createRouteFn("delete") as any,
		get: createRouteFn("get") as any,
		head: createRouteFn("head") as any,
		options: createRouteFn("options") as any,
		patch: createRouteFn("patch") as any,
		post: createRouteFn("post") as any,
		put: createRouteFn("put") as any,
	};
}

function always() {
	return {};
}
