import { Plugin, UserConfig } from "vite";
import path from "node:path";
import { BuildStep } from "@vavite/multibuild";
import fs from "node:fs";
import { resolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";

export interface InjectConfigOptions {
	hattipEntry?: string;
	nodeEntry?: string;
	extraServerEntries?: string | string[] | Record<string, string>;
	clientEntries?: boolean | string | string[] | Record<string, string>;
	clientConfig?: UserConfig;
	serverConfig?: UserConfig;
	bundler?: string | { name: string; default(): Promise<void> };
}

export function injectConfig(options: InjectConfigOptions): Plugin {
	return {
		name: "hattip:inject-config",

		enforce: "pre",

		async config(cfg): Promise<UserConfig & { buildSteps?: BuildStep[] }> {
			const mainOutDir = cfg.build?.outDir ?? "dist";

			const buildSteps: BuildStep[] = [];

			if (options.clientConfig || options.clientEntries) {
				buildSteps.push({
					name: "client",
					config: {
						...options.clientConfig,
						build: {
							...options.clientConfig?.build,
							manifest: true,
							outDir: mainOutDir + "/client",
							rollupOptions: {
								...options.clientConfig?.build?.rollupOptions,
								input: {
									...(typeof options.clientEntries === "boolean"
										? {}
										: wrapInputOption(options.clientEntries)),
									...wrapInputOption(
										options.clientConfig?.build?.rollupOptions?.input,
									),
								},
							},
						},
					},
				});
			}

			const serverEntry = wrapInputOption(options.extraServerEntries);

			const root = cfg.root ?? process.cwd();
			serverEntry["entry-hattip"] =
				options.hattipEntry ?? (await findServerEntry(root))!;

			serverEntry["entry-node"] =
				options.nodeEntry ??
				(await findServerEntry(root, true)) ??
				"virtual:hattip:default-node-entry";

			buildSteps.push({
				name: "server",
				config: {
					...options.serverConfig,
					build: {
						outDir: mainOutDir + "/server",
						ssr: true,
						...options.serverConfig?.build,
						rollupOptions: {
							...options.serverConfig?.build?.rollupOptions,
							input: {
								...wrapInputOption(serverEntry),
								...wrapInputOption(
									options.serverConfig?.build?.rollupOptions?.input,
								),
							},
						},
					},
				},
			});

			let bundler = options.bundler;
			if (typeof bundler === "string") {
				const modulePath = await resolve(
					bundler,
					pathToFileURL(root + "/index.js").href,
				);
				bundler = await import(modulePath);
			}

			return {
				buildSteps,
				api: {
					hattip: {
						bundler,
					},
				},
			} as any;
		},
	};
}

type InputOption = string | string[] | Record<string, string>;

function wrapInputOption(input?: InputOption): Record<string, string> {
	if (!input) {
		return {};
	}

	if (typeof input === "string") {
		input = [input];
	}

	if (Array.isArray(input)) {
		const result: Record<string, string> = {};
		for (const key of input) {
			const alias = path.parse(key).name;
			result[alias] = key;
		}

		return result;
	}

	return input;
}

export async function findServerEntry(
	root: string,
	node?: boolean,
): Promise<string | undefined> {
	const dirs = ["", "src", "server", "src/server"];
	const names = node
		? ["entry-node", "entry.node", "index.node"]
		: [
				"entry-hattip",
				"server",
				"entry-server",
				"index",
				"index.hattip",
				"index.server",
		  ];
	const extensions = [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"];

	for (const dir of dirs) {
		for (const name of names) {
			for (const ext of extensions) {
				const file = path.join(root, dir, name + ext);
				if (fs.existsSync(file)) {
					return file;
				}
			}
		}
	}

	if (!node) {
		throw new Error("hattip: Could not find server entry");
	}
}
