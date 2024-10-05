import { performance } from "node:perf_hooks";
import { BuildOptions, ServerOptions, LogLevel } from "vite";
import { cac } from "cac";
import { version } from "../package.json";
import { spawn } from "node:child_process";

export const startTime = performance.now();

export interface GlobalCLIOptions {
	"--"?: string[];
	c?: boolean | string;
	config?: string;
	base?: string;
	l?: LogLevel;
	logLevel?: LogLevel;
	clearScreen?: boolean;
	d?: boolean | string;
	debug?: boolean | string;
	f?: string;
	filter?: string;
	m?: string;
	mode?: string;
}

export interface HattipCliOptions {
	root?: string;
	node?: string;
	client?: boolean | string | string[];
}

interface HattipCliShorthands {
	r?: string;
	n?: string;
	C?: string | string[];
}

const cli = cac("hattip");

/**
 * Remove global flags before passing as command specific sub-configs
 */
export function cleanOptions<
	Options extends GlobalCLIOptions & HattipCliShorthands,
>(
	options: Options,
): Omit<Options, keyof GlobalCLIOptions | keyof HattipCliShorthands> {
	const ret = { ...options };
	delete ret["--"];
	delete ret.c;
	delete ret.config;
	delete ret.base;
	delete ret.l;
	delete ret.logLevel;
	delete ret.clearScreen;
	delete ret.d;
	delete ret.debug;
	delete ret.f;
	delete ret.filter;
	delete ret.m;
	delete ret.mode;

	delete ret.r;
	delete ret.n;
	delete ret.C;

	return ret;
}

cli
	.option("-c, --config <file>", `[string] use specified config file`)
	.option("--base <path>", `[string] public base path (default: /)`)
	.option("-l, --logLevel <level>", `[string] info | warn | error | silent`)
	.option("--clearScreen", `[boolean] allow/disable clear screen when logging`)
	.option("-d, --debug [feat]", `[string | boolean] show debug logs`)
	.option("-f, --filter <filter>", `[string] filter debug logs`)
	.option("-m, --mode <mode>", `[string] set env mode`);

declare global {
	// eslint-disable-next-line no-var
	var __vavite_loader__: boolean;
}

cli
	.command("[hattip-entry]", "Start a dev server")
	.alias("dev")
	.alias("serve")

	.option("-r, --root", "[string] project root")
	.option("-n, --node", "[string] Node.js entry")
	.option(
		"-C, --client [client-entry]",
		"[string] client entry (can be repeated)",
	)

	.option("--host [host]", `[string] specify hostname`)
	.option("--port <port>", `[number] specify port`)
	.option("--https", `[boolean] use TLS + HTTP/2`)
	.option("--open [path]", `[boolean | string] open browser on startup`)
	.option("--cors", `[boolean] enable CORS`)
	.option("--strictPort", `[boolean] exit if specified port is already in use`)
	.option(
		"--force",
		`[boolean] force the optimizer to ignore the cache and re-bundle`,
	)
	.option("--use-loader", `[boolean] use ESM loader (experimental)`)
	.action(
		async (
			root: string,
			options: ServerOptions &
				GlobalCLIOptions & {
					useLoader?: boolean;
					force?: boolean;
				},
		) => {
			if (options.useLoader && !globalThis.__vavite_loader__) {
				// Rerun the command with the loader options
				const options =
					(process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + " " : "") +
					"-r @hattip/vite/suppress-loader-warnings --loader @hattip/vite/node-loader";

				const cp = spawn(process.execPath, process.argv.slice(1), {
					stdio: "inherit",
					env: {
						...process.env,
						NODE_OPTIONS: options,
					},
				});

				cp.on("error", (err) => {
					console.error(err);
					process.exit(1);
				});

				cp.on("exit", (code) => {
					process.exit(code ?? 0);
				});

				return;
			}

			delete options.useLoader;

			return import("./serve").then(({ serve }) => serve(root, options));
		},
	);

cli
	.command("build [hattip-entry]", "Build for production")

	.option("-r, --root", "[string] project root")
	.option("-n, --node <node-entry>", "[string] Node.js entry")
	.option("-C, --client [client-entry]", "[string] client entry")

	.option("--target <target>", `[string] transpile target (default: 'modules')`)
	.option("--outDir <dir>", `[string] output directory (default: dist)`)
	.option(
		"--assetsDir <dir>",
		`[string] directory under outDir to place assets in (default: _assets)`,
	)
	.option(
		"--assetsInlineLimit <number>",
		`[number] static asset base64 inline threshold in bytes (default: 4096)`,
	)
	.option(
		"--sourcemap",
		`[boolean] output source maps for build (default: false)`,
	)
	.option(
		"--minify [minifier]",
		`[boolean | "terser" | "esbuild"] enable/disable minification, ` +
			`or specify minifier to use (default: esbuild)`,
	)
	.option("--manifest", `[boolean] emit build manifest json`)
	.option("--ssrManifest", `[boolean] emit ssr manifest json`)
	.option(
		"--emptyOutDir",
		`[boolean] force empty outDir when it's outside of root`,
	)
	.option("-w, --watch", `[boolean] rebuilds when modules have changed on disk`)
	.action((root: string, options: BuildOptions & GlobalCLIOptions) =>
		import("./build").then(({ build }) => build(root, options)),
	);

cli.help();
cli.version(version);

cli.parse();
