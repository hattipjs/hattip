export default async function handler(request, context) {
  const routes = {
    "/": () => import("./routes/index.js"),
    "/binary": () => import("./routes/binary.js"),
    "/bin-stream": () => import("./routes/bin-stream.js"),
    "/echo-text": () => import("./routes/echo-text.js"),
    "/echo-bin": () => import("./routes/echo-bin.js"),
    "/cookies": () => import("./routes/cookies.js"),
    "/status": () => import("./routes/status.js"),
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
