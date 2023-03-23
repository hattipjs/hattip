import type { Plugin, ViteDevServer } from "vite";

declare global {
	// eslint-disable-next-line no-var
	var __vite_dev_server__: ViteDevServer | undefined;
}

export function exposeDevServer(): Plugin {
	let dev = false;

	return {
		name: "virtual:expose-vite-dev-server",

		enforce: "pre",

		config(_, env) {
			dev = env.command === "serve";
		},

		configureServer(server) {
			globalThis.__vite_dev_server__ = server;
		},

		resolveId(source, _importer, options) {
			if (source === "virtual:vite-dev-server" && options.ssr) {
				return "\0virtual:vite-dev-server";
			}
		},

		load(id) {
			if (
				id === "virtual:vite-dev-server" ||
				id === "\0virtual:vite-dev-server"
			) {
				return (
					"export default " +
					(dev ? "globalThis.__vite_dev_server__" : "undefined")
				);
			}
		},
	};
}
