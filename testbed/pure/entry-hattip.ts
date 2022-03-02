import { Context, Handler } from "@hattip/core";

interface Route {
	default: Handler;
}

export default async function handler(request: Request, context: Context) {
	const routes: Record<string, undefined | (() => Promise<Route>)> = {
		"/": () => import("./routes/index"),
		"/binary": () => import("./routes/binary"),
		"/str-stream": () => import("./routes/str-stream"),
		"/bin-stream": () => import("./routes/bin-stream"),
		"/echo-text": () => import("./routes/echo-text"),
		"/echo-bin": () => import("./routes/echo-bin"),
		"/cookies": () => import("./routes/cookies"),
		"/status": () => import("./routes/status"),
	};

	const url = new URL(request.url);
	const route = routes[url.pathname];

	if (!route) {
		return;
	}

	const routeModule = await route();
	const routeHandler = routeModule.default;

	return routeHandler(request, context);
}
