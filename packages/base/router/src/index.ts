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

export interface RouterContext<P = Record<string, string>>
	extends RequestContext {
	params: P;
}

export type RouteFn =
	| (<P>(matcher: Matcher, handler: RouteHandler<P>) => void)
	| (<P>(handler: RouteHandler<P>) => void);

export interface Router {
	/** Compose route handlers into a single handler */
	buildHandler(): HattipHandler;

	/** Route handlers */
	handlers: RequestHandler[];

	use<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	use<P>(handler: RouteHandler<P>): void;

	checkout<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	checkout<P>(handler: RouteHandler<P>): void;

	copy<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	copy<P>(handler: RouteHandler<P>): void;

	delete<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	delete<P>(handler: RouteHandler<P>): void;

	get<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	get<P>(handler: RouteHandler<P>): void;

	head<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	head<P>(handler: RouteHandler<P>): void;

	lock<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	lock<P>(handler: RouteHandler<P>): void;

	merge<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	merge<P>(handler: RouteHandler<P>): void;

	mkactivity<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	mkactivity<P>(handler: RouteHandler<P>): void;

	mkcol<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	mkcol<P>(handler: RouteHandler<P>): void;

	move<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	move<P>(handler: RouteHandler<P>): void;

	"m-search"<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	"m-search"<P>(handler: RouteHandler<P>): void;

	notify<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	notify<P>(handler: RouteHandler<P>): void;

	options<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	options<P>(handler: RouteHandler<P>): void;

	patch<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	patch<P>(handler: RouteHandler<P>): void;

	post<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	post<P>(handler: RouteHandler<P>): void;

	purge<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	purge<P>(handler: RouteHandler<P>): void;

	put<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	put<P>(handler: RouteHandler<P>): void;

	report<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	report<P>(handler: RouteHandler<P>): void;

	search<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	search<P>(handler: RouteHandler<P>): void;

	subscribe<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	subscribe<P>(handler: RouteHandler<P>): void;

	trace<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	trace<P>(handler: RouteHandler<P>): void;

	unlock<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	unlock<P>(handler: RouteHandler<P>): void;

	unsubscribe<P>(matcher: Matcher, handler: RouteHandler<P>): void;
	unsubscribe<P>(handler: RouteHandler<P>): void;
}

export type Matcher<P = Record<string, string>> =
	| string
	| RegExp
	| ((context: RequestContext) => undefined | P | Promise<undefined | P>);

export type RouteHandler<P = Record<string, string>> = (
	context: RouterContext<P>,
) => MaybeAsyncResponse;

export function createRouter(): Router {
	const self = {
		handlers: [] as RouteHandler[],

		buildHandler() {
			return compose(this.handlers);
		},
	};

	return new Proxy(self, {
		get(target, prop) {
			if (prop in target) {
				return target[prop as keyof typeof target];
			}

			return ((target as any)[prop] = function (
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
							prop === "use" ||
							context.method === String(prop).toUpperCase()
						) {
							const match = context.url.pathname.match(matcher as RegExp);

							return match && (match.groups || {});
						}
					};
				} else {
					throw new TypeError("Invalid matcher");
				}

				function route(context: RequestContext) {
					context.params = fn(context);
					if (!context.params) {
						return;
					}

					return handler!(context);
				}

				target.handlers.push(route as any);
			});
		},
	}) as any;
}

function always() {
	return {};
}
