import { build, BuildOptions } from "esbuild";
import { builtinModules } from "node:module";
import path from "node:path";
import cpr from "cpr";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const shimsDir = fileURLToPath(
	new URL(
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		typeof Deno === "undefined" ? "../shims" : "./shims",
		import.meta.url,
	),
);

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
	/**
	 * Enable Node.js compatibility (e.g. polyfilling Node.js globals).
	 */
	nodeCompat?: boolean;
}

export default async function bundle(
	options: BundlingOptions,
	manipulateEsbuildOptions?: (options: BuildOptions) => void | Promise<void>,
) {
	const { input, output, staticDir, nodeCompat = false } = options;
	const filter = new RegExp(`^(node:)?(${builtinModules.join("|")})$`);

	const esbuildOptions: BuildOptions = {
		logLevel: "info",
		bundle: true,
		// minify: true,
		entryPoints: [input],
		outfile: output,
		inject: nodeCompat
			? [
					"global.js",
					"buffer.js",
					"console.js",
					"filename.js",
					"performance.js",
					"process.js",
					"timers.js",
				].map((file) => path.join(shimsDir, file))
			: [],
		platform: "node",
		target: "chrome96",
		format: "esm",
		conditions: ["deno", "import", "module", "require", "default"],
		external: ["https:*", "http:*", "node:*"],
		plugins: nodeCompat
			? [
					{
						name: "node-builtins",

						setup(build) {
							build.onResolve({ filter }, async ({ path, kind }) => {
								const [, , moduleName] = path.match(filter)!;

								return kind === "require-call"
									? {
											path: `${moduleName}`,
											namespace: "node:require",
											sideEffects: false,
										}
									: {
											path: `node:${moduleName}`,
											external: true,
											sideEffects: false,
										};
							});

							build.onLoad(
								{
									namespace: "node:require",
									filter: /.*/,
								},
								async ({ path }) => {
									return {
										contents: `import all from "${path}"; module.exports = all;`,
									};
								},
							);
						},
					},
				]
			: undefined,
	};

	await manipulateEsbuildOptions?.(esbuildOptions);
	await build(esbuildOptions);

	if (staticDir) {
		await promisify(cpr)(staticDir, path.dirname(output) + "/public", {
			deleteFirst: true,
		});
	}
}
