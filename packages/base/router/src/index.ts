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

	checkout<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	checkout<P>(handler: RouteHandler<P, Platform>): void;

	copy<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	copy<P>(handler: RouteHandler<P, Platform>): void;

	delete<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	delete<P>(handler: RouteHandler<P, Platform>): void;

	get<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	get<P>(handler: RouteHandler<P, Platform>): void;

	head<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	head<P>(handler: RouteHandler<P, Platform>): void;

	lock<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	lock<P>(handler: RouteHandler<P, Platform>): void;

	merge<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	merge<P>(handler: RouteHandler<P, Platform>): void;

	mkactivity<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	mkactivity<P>(handler: RouteHandler<P, Platform>): void;

	mkcol<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	mkcol<P>(handler: RouteHandler<P, Platform>): void;

	move<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	move<P>(handler: RouteHandler<P, Platform>): void;

	"m-search"<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	"m-search"<P>(handler: RouteHandler<P, Platform>): void;

	notify<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	notify<P>(handler: RouteHandler<P, Platform>): void;

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

	purge<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	purge<P>(handler: RouteHandler<P, Platform>): void;

	put<P>(matcher: Matcher<Platform>, handler: RouteHandler<P, Platform>): void;
	put<P>(handler: RouteHandler<P, Platform>): void;

	report<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	report<P>(handler: RouteHandler<P, Platform>): void;

	search<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	search<P>(handler: RouteHandler<P, Platform>): void;

	subscribe<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	subscribe<P>(handler: RouteHandler<P, Platform>): void;

	trace<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	trace<P>(handler: RouteHandler<P, Platform>): void;

	unlock<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	unlock<P>(handler: RouteHandler<P, Platform>): void;

	unsubscribe<P>(
		matcher: Matcher<Platform>,
		handler: RouteHandler<P, Platform>,
	): void;
	unsubscribe<P>(handler: RouteHandler<P, Platform>): void;
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
