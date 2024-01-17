import { build, BuildOptions } from "esbuild";
import { builtinModules } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import archiver from "archiver";

/**
 * Bundling options
 */
export interface BundlingOptions {
	/** The entry point for the AWS Lambda handler */
	input: string;
	/** The output file or directory */
	output: string;
	/** Whether to zip the output */
	zip: boolean;
	/** Files or directories to copy next to the output */
	copy: string[];
}

export async function bundle(
	options: BundlingOptions,
	manipulateEsbuildOptions?: (options: BuildOptions) => void | Promise<void>,
) {
	const { input, output, zip, copy } = options;

	let outdir = output;
	if (zip) {
		// Use a temporary directory if we're zipping
		outdir = fs.mkdtempSync(path.join(os.tmpdir(), "hattip-aws-"));
	}

	const filter = new RegExp(`^(node:)?(${builtinModules.join("|")})$`);

	const esbuildOptions: BuildOptions = {
		logLevel: "info",
		bundle: true,
		splitting: true,
		minify: true,
		entryPoints: {
			index: input,
		},
		outExtension: { ".js": ".mjs" },
		outdir,
		platform: "node",
		target: "node18",
		format: "esm",
		external: builtinModules,

		plugins: [
			{
				name: "node-builtins",

				setup(build) {
					build.onResolve({ filter }, async ({ path, kind }) => {
						const match = path.match(filter);
						if (!match) {
							return;
						}

						const [, , moduleName] = match;

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
		],
	};

	await manipulateEsbuildOptions?.(esbuildOptions);
	await build(esbuildOptions);

	for (const file of copy) {
		fs.cpSync(file, path.join(outdir, file), { recursive: true });
	}

	if (zip) {
		// Zip the output
		const archive = archiver("zip");

		const stream = fs.createWriteStream(output);

		return new Promise<void>((resolve, reject) => {
			archive
				.directory(outdir, false)
				.on("error", reject)
				.pipe(stream)
				.on("close", () => {
					// Clean up the temporary directory
					fs.rmSync(outdir, { recursive: true });
					resolve();
				})
				.on("error", reject);

			return archive.finalize();
		});
	}
}
