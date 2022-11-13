import { build, BuildOptions } from "esbuild";
import { builtinModules } from "module";
import path from "path";
import cpr from "cpr";
import { promisify } from "util";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundling options
 */
export interface BundlingOptions {
	/**
	 * Deno module entry point.
	 */
	input: string;
	/** Output file name for the bundle */
	output: string;
	/**
	 * Static files directory to copy next to the output.
	 * @default undefined
	 */
	staticDir?: string;
}

export default async function bundle(
	options: BundlingOptions,
	manipulateEsbuildOptions?: (options: BuildOptions) => void | Promise<void>,
) {
	const { input, output, staticDir } = options;

	const esbuildOptions: BuildOptions = {
		logLevel: "info",
		bundle: true,
		minify: true,
		entryPoints: [input],
		outfile: output,
		platform: "node",
		target: "chrome96",
		format: "esm",
		mainFields: ["module", "main", "browser"],
		conditions: ["deno", "worker", "import", "require"],
		external: [...builtinModules, "https:*"],
		inject: [path.resolve(dirname, "../deno-env-shim.js")],
	};

	await manipulateEsbuildOptions?.(esbuildOptions);
	await build(esbuildOptions);

	if (staticDir) {
		await promisify(cpr)(staticDir, path.dirname(output) + "/public", {
			deleteFirst: true,
		});
	}
}
