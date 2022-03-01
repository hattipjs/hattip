# Va vite!

`vavite` is a set of tools for developing and building server-side applications with [Vite](https://vitejs.dev).

Vite, despite being a frontend tool, has support for transpiling server-side code. The feature is intended for building [server-side rendering (SSR)](https://vitejs.dev/guide/ssr.html) applications. But there's no reason why it can't be leveraged for building server-side applications that are not necessarily related to SSR.

Vite's official SSR guide describes a workflow where Vite's development server is used as a middleware function in a server application made with a [Connect](https://github.com/senchalabs/connect) compatible Node.js framework (like [Express](https://expressjs.com)). If your server-side code needs transpilation (e.g. for TypeScript), this workflow requires you to use another set of tools (say [`ts-node`](https://typestrong.org/ts-node/) and [`nodemon`](https://nodemon.io/)) for development and building. `vavite` enables you to use Vite itself to transpile your server-side code.

## Examples

- [simple-standalone](../../examples/simple-standalone): Simple handlerEntry example
- [ssr-react-express](../../examples/ssr-react-express): React SSR with Express
- [ssr-vue-express](../../examples/ssr-vue-express): Vue SSR with Express
- [vite-plugin-ssr](../../examples/vite-plugin-ssr): vite-plugin-ssr with React and express
- [express](../../examples/express): Integrating with Express
- [koa](../../examples/koa): Integrating with Koa
- [fastify](../../examples/fastify): Integrating Fastify
- [hapi](../../examples/hapi): Integrating with Hapi

## Installation and usage

Install `vite` and `vavite` as development dependencies (`npm install --save-dev vite vavite`) and add `vavite` to your Vite config:

```ts
import { defineConfig } from "vite";
import vavite from "vavite";

export default defineConfig({
	plugins: [
		vavite({
			// Options, see below
		}),
	],
});
```

## Using `serverEntry`

By setting the `serverEntry` option without setting the `handlerEntry`, you can use `vavite` to develop and build Node.js application with Express, Koa, Fastify, Hapi, or any other Node.js framework that allows you to provide your own `http.Server` instance. To integrate with Vite's dev server during development, you `import httpDevServer from "vavite/http-dev-server"` and use it in place of a `http.Server` instance. How to do this depends on the framework:

Some frameworks expose their request listener: For example in Express, `app` is itself the request listener and in Koa you can access it with `app.callback()`:

```ts
import express from "express";
import httpDevServer from "vavite/http-dev-server";

const app = express();

// Configure your server here
app.get("/", (req, res) => {
	res.send("Hello, world!");
});

if (import.meta.env.PROD) {
	// For production, start your server
	// as you would normally do.
	app.listen(3000, "localhost", () => {
		console.log("Server started on http://localhost:3000");
	});
} else {
	// For development, use httpDevServer.
	httpDevServer!.on("request", app);
}
```

Other frameworks don't expose their request listener but instead allow you to provide a server instance. See the examples for [Express](../../examples/reloader-express), [Koa](../../examples/reloader-koa), [Fastify](../../examples/reloader-fastify), and [Hapi](../../examples/reloader-hapi) to see specific implementations.

In SSR application, you can enable the serving of client assets by setting `serveClientAssetsInDev` option to true. For production, you will have to serve the assets yourself, e.g. by using [`express.static`](https://expressjs.com/en/starter/static-files.html).

### Lazy loading route handlers

One of the most important advantages of Vite is its on-demand nature: Modules are only transpiled when they are actually used. By default, `vavite` reloads your server entry every time one of its dependencies changes. Since the server entry is the the root of the dependency tree, this means _any_ change in your server-side code will trigger a full reload. Although it works, it doesn't tap into the full potential of Vite.

A typical Node.js server application lifecycle consists of two phases. The first is the initialization phase where you create and configure your server instance and the second is the request listening phase where the application services incoming requests as they come in. Typically, the initialization code changes less often and request listeners change more often and more granularly.

`vavite` can be used to lazy load request handlers to avoid re-executing the initialization code unnecessarily: If you set the configuration option `reloadOn` to `"static-deps-change"` (instead of the default `"any-change"`), `vavite` will not reload the server entry when its dynamically imported dependencies change. For example, if you have an Express route listener like this:

```ts
import routeHandler from "./route-handler";

app.get("/my-route", routeHandler);
```

You can avoid re-executing your initialization code by refactoring it like this:

```ts
app.get("/my-route", async (req, res, next) => {
	// Omitting error handling for clarity
	const routeHandler = (await import("./route-handler")).default;
	routeHandler(req, res, next);
});
```

This way, changes to your route handlers will not force a server reload and your route handler will only be transpiled and loaded when a request to the path `"/my-route"` comes in, greatly improving development-time performance.

If this lazy loading pattern feels too wordy, you can refactor it into a function suitable for your server framework. One possible implementation for Express could be:

```ts
function lazy(
  importer: () => Promise<{ default: RequestHandler }>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const routeHandler = (await importer()).default;
      routeHandler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// When reloadOn option is set to "static-deps-change",
// changes to the route handlers will not trigger a reload.
app.get"/foo", lazy(() => import("./routes/foo")));

app.get("/bar", lazy(() => import("./routes/bar")));

app.get("/baz", lazy(() => import("./routes/baz")));

```

## Using `handlerEntry`

This option provides a simpler workflow if you don't need to control the server setup during development.

If you provide the `handlerEntry` option instead of a `serverEntry`, `vavite` will expect you to default export a request handler (with the `(req, res, next)` signature) from the `handlerEntry` file. During development, it will be used as a middleware function in the Vite development server, allowing you to handle requests. For production, `vavite` will build a standalone server application if `standalone` option is set to `true`. You can set it to `false` if you intend to import and use your handler function in a separate server application.

If you're building a standalone SSR application, you can set `clientAssetsDir` to the directory that will contain your client-side assets abd the [`sirv`](https://github.com/lukeed/sirv) package will be used to serve them during production. If `serveClientAssetsInDev` to `true` (the default), they will be served during development too. You can set `bundleSirv` to `false` to import `sirv` in runtime instead of bundling it. In that case you will have to install it as a dependency. In either case, you can export `sirvOptions` from the handler entry file to customize the behavior of `sirv`.

If you set `serverEntry` in addition to `handlerEntry`, it will be used as the entry point in production **but it will not be used in development**. In that case, `sirv` will not be used and you will have to handle the serving of client assets in production yourself if needed.

`vavite/http-dev-server` is not available (or necessary) when using the handler mode.

## Accessing Vite's dev server

You can `import viteDevServer from "vavite/vite-dev-server"` to access the Vite development server instance. It will allow you to access methods such as `ssrFixStacktrace` and `transformIndexHtml` in your application.

## Multiple builds

Developing applications that perform server-side rendering (SSR) with Vite requires two separate build steps: one for the client and one for the server. This package comes with a CLI program named `vavite` for orchestrating multiple Vite builds.

`vavite` extends the Vite configuration with a `buildSteps` property, which is an array of build step definitions. A build step definition is an object with a `name` property (which is simply a string naming the build step), and an optional `config` property which will be merged into the Vite configuration for the build step. For example, a client build followed by a server build can be defined like this:

```ts
import { defineConfig } from "vite";
import vavite from "vavite";

export default defineConfig({
	plugins: [
		vavite({
			// Options
		}),
	],
	buildSteps: [
		{
			name: "client",
			config: {
				build: {
					outDir: "dist/client",
					rollupOptions: {
						// Client entry
						input: "/client",
					},
				},
			},
		},
		{
			name: "server",
			config: {
				build: {
					// Server entry
					ssr: "/server",
					outDir: "dist/server",
				},
			},
		},
	],
});
```

If you include the `vavite` plugin and a `buildSteps` option in your Vite config, the plugin will error out if you try to build with `vite build`. You're expected to use the `vavite` command as a drop-in replacement for `vite build` instead. This will first call `resolveConfig` with the `mode` parameter set to `"multibuild"` to extract the build steps. Setting `buildSteps` in subsequent steps has no effect.Then the build steps will be executed in the order they are defined.

### Sharing information between builds

`vavite` will call the `buildStepStart` hook on each plugin when a build step starts and pass it the information about the current step and data forwarded from the previous step. The `buildStepEnd` hook will be called when the build step ends and its return value will be forwarded to the next step. If a promise is returned, it will be awaited first.

If no build steps are defined, `buildStepStart` and `buildStepEnd` will not be called.
