import { Handler, Context } from "@hattip/core";

export interface RouterContext<P = Record<string, string>> extends Context {
  url: URL;
  params: P;
}

export interface Router {
  handle: Handler;

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
    handlers: [] as RouteHandler[],

    async handle(request: Request, context: Context) {
      for (const handler of self.handlers) {
        const result = await handler(request, context as any);
        if (result) {
          return result;
        }
      }
    },
  };

  return new Proxy(self, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target];
      }

      return function (matcher: Matcher, handler: RouteHandler) {
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

        target.handlers.push(route as any);
      };
    },
  }) as any;
}
