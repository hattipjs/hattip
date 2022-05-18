/// reference types="../ambient.d.ts" />

import { Handler, Context, StrictHandler, compose } from "@hattip/core";

export interface RouterContext<P = Record<string, string>> extends Context {
  url: URL;
  params: P;
}

export interface Router {
  handler: Handler;

  all: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  checkout: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  copy: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  delete: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  get: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  head: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  lock: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  merge: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  mkactivity: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  mkcol: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  move: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  "m-search": <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  notify: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  options: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  patch: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  post: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  purge: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  put: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  report: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  search: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  subscribe: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  trace: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  unlock: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
  unsubscribe: <P>(matcher: Matcher, handler: RouteHandler<P>) => void;
}

export type Matcher<P = Record<string, string>> =
  | string
  | RegExp
  | ((
      request: Request,
      context: Context,
    ) => undefined | P | Promise<undefined | P>);

export type RouteHandler<P = Record<string, string>> = (
  request: Request,
  context: RouterContext<P>,
) => null | Response | Promise<null | Response>;

export function createRouter(): Router {
  const self = {
    _handlers: [] as RouteHandler[],
    _composed: undefined as StrictHandler | undefined,

    async handler(request: Request, context: Context) {
      const composed = self._composed || compose(...self._handlers);
      return composed(request, context);
    },
  };

  return new Proxy(self, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }

      return ((target as any)[prop] = function (
        matcher: Matcher,
        handler: RouteHandler,
      ) {
        let fn: (
          request: Request,
          context: RouterContext,
        ) => null | any | Promise<null | any>;

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
          fn = (request, context) => {
            if (
              prop === "all" ||
              request.method === String(prop).toUpperCase()
            ) {
              const match = context.url.pathname.match(matcher as RegExp);

              return match && (match.groups || {});
            }
          };
        } else {
          throw new TypeError("Invalid matcher");
        }

        function route(request: Request, context: RouterContext) {
          context.url = new URL(request.url);
          context.params = fn(request, context);
          if (!context.params) {
            return;
          }

          return handler(request, context);
        }

        target._handlers.push(route as any);
        target._composed = undefined;
      });
    },
  }) as any;
}
