import { BuildOptions, InlineConfig, ResolvedConfig } from "vite";
import { multibuild } from "@vavite/multibuild";
import { version } from "../package.json";
import pico from "picocolors";
import { cleanOptions, GlobalCLIOptions, HattipCliOptions, startTime } from ".";
import { hattip } from "./vite-plugin";

export interface HattipBuildOptions {
	hattipEntry?: string;
	platform?: "node" | "cloudflare-workers" | "cfw";
	platformEntry?: string;
	bundler?: "wrangler" | "hattip";
	nodeCompat?: boolean;
	minify?: boolean;
}

export async function build(
	hattipEntry: string | undefined,
	rawOptions: BuildOptions & GlobalCLIOptions & HattipCliOptions,
) {
	const { root, node: nodeEntry, client: clientEntry, ...options } = rawOptions;
	const buildOptions: BuildOptions = cleanOptions(options);

	(globalThis as any).__hattip_cli_options__ = {
		hattipEntry,
		nodeEntry,
		clientEntries: clientEntry,
	};

	let config: ResolvedConfig;
	let total: number;

	function logStep(index: number, name: string) {
		config.logger.info(
			"\n" +
				pico.green("Hattip") +
				" (" +
				pico.green(`${index}/${total}`) +
				"): " +
				name,
		);
	}

	const inlineConfig: InlineConfig = {
		root,
		base: options.base,
		mode: options.mode,
		configFile: options.config,
		logLevel: options.logLevel,
		clearScreen: options.clearScreen,
		build: buildOptions,
	};

	let serverOutDir: string | undefined;

	await multibuild(inlineConfig, {
		onMissingConfigFile() {
			inlineConfig.plugins = [
				hattip({
					hattipEntry,
					nodeEntry,
					clientEntries: clientEntry,
				}),
			];
			return inlineConfig;
		},

		onInitialConfigResolved(resolvedConfig) {
			config = resolvedConfig;

			if (!config.plugins.some((p) => p.name === "hattip:inject-config")) {
				throw new Error("Please add Hattip Vite plugin to your Vite config");
			}

			config.logger.info(pico.green("\n🎩 Hattip ") + pico.magenta(version));

			total = config.buildSteps?.length || 1;

			if ((config as any).api?.hattip?.bundler) {
				total++;
			}
		},

		onStartBuildStep(info) {
			if (info.currentStep.vite === false) {
				return;
			}

			if (info.currentStep.name === "server") {
				serverOutDir = info.currentStep.config?.build?.outDir;
			}
			logStep(info.currentStepIndex + 1, "Building " + info.currentStep.name);
		},
	});

	if ((config! as any)?.api?.hattip?.bundler) {
		logStep(total!, (config! as any).api.hattip.bundler.action);
		await (config! as any).api.hattip.bundler.build({
			root,
			build: { outDir: serverOutDir! },
		});
	}

	config!.logger.info(
		pico.cyan(
			`\nBuild completed in ${pico.white(
				pico.bold(Math.ceil(performance.now() - startTime)),
			)} ms`,
		),
	);
}
