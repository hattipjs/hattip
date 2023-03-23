import {
	createServer,
	InlineConfig,
	resolveConfig,
	ServerOptions,
	version as viteVersion,
} from "vite";
import { cleanOptions, GlobalCLIOptions, HattipCliOptions, startTime } from ".";
import pico from "picocolors";
import { version } from "../package.json";
import { hattip } from "./vite-plugin";

export async function serve(
	hattipEntry: string | undefined,
	serveOptions: ServerOptions & GlobalCLIOptions & HattipCliOptions,
) {
	const {
		root,
		node: nodeEntry,
		client: clientEntry,
		...options
	} = serveOptions;
	const serverOptions: ServerOptions = cleanOptions(options);
	const inlineConfig = {
		root,
		base: options.base,
		mode: options.mode,
		configFile: options.config,
		logLevel: options.logLevel,
		clearScreen: options.clearScreen,
		optimizeDeps: { force: options.force },
		server: serverOptions,
		api: {
			hattip: {
				hattipEntry,
				nodeEntry,
				clientEntries: clientEntry,
			},
		},
	} as InlineConfig;

	(globalThis as any).__hattip_cli_options__ = {
		hattipEntry,
		nodeEntry,
		clientEntries: clientEntry,
	};

	const initialConfig = await resolveConfig(inlineConfig, "serve").catch(
		(error) => {
			console.error(pico.red(`error resolving config:\n${error.stack}`), {
				error,
			});
			process.exit(1);
		},
	);

	if (!initialConfig.plugins.some((p) => p.name === "hattip:inject-config")) {
		inlineConfig.plugins = [
			hattip({
				hattipEntry,
				nodeEntry,
				clientEntries: clientEntry,
			}),
		];
	}

	try {
		const server = await createServer(inlineConfig);

		if (!server.httpServer) {
			throw new Error("HTTP server not available");
		}

		await server.listen();

		const info = server.config.logger.info;

		const startupDurationString = startTime
			? pico.dim(
					`(ready in ${pico.white(
						pico.bold(Math.ceil(performance.now() - startTime)),
					)} ms)`,
			  )
			: "";

		info(
			pico.green("\n🎩 HatTip " + version) +
				pico.cyan(` (vite ${viteVersion})`) +
				pico.white(": Development server is running") +
				" " +
				startupDurationString +
				"\n",
			{ clear: !server.config.logger.hasWarned },
		);

		server.printUrls();
	} catch (e: any) {
		initialConfig.logger.error(
			pico.red(`error when starting dev server:\n${e.stack}`),
			{ error: e },
		);
		process.exit(1);
	}
}
