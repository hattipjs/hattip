import { cac } from "cac";
import { version } from "../package.json";
import {
	createCompressedFileListModule,
	createFileListModule,
	createFileMapModule,
	createFileSetModule,
} from ".";
import { writeFile } from "node:fs/promises";

const cli = cac("hattip-walk");

cli
	.command(
		"[dir] [output]",
		"Walk the directory <dir> (current directory by default) and output a file manifest",
	)
	.option(
		"-p, --prune <pattern>",
		"Pattern to prune from the walk (can be specified multiple times)",
	)
	.option("-e, --etag", "Generate an etag for each file (default: true)")
	.option(
		"-s, --set",
		"Output a JS module exporting a Set of files instead of a list",
	)
	.option(
		"-m, --map",
		"Output a JS module exporting a map of URL pathnames to file paths",
	)
	.option("-c, --compress", "Output a 'compressed' manifest")
	.action(
		async (
			dir: string = process.cwd(),
			output: string | undefined,
			{
				prune,
				etag,
				set,
				map,
				compress,
			}: {
				prune?: (string | RegExp)[];
				etag?: boolean;
				set?: boolean;
				map?: boolean;
				compress?: boolean;
			},
		) => {
			if (prune) {
				if (typeof prune === "string") prune = [prune];

				prune = prune.map((p) =>
					(p as string).startsWith("/")
						? new RegExp((p as string).slice(1, -1))
						: p,
				);
			}

			let result = "";

			const options = { prune, etag };

			if (set) {
				result = await createFileSetModule(dir, options);
			} else if (map) {
				result = await createFileMapModule(dir, options);
			} else if (compress) {
				result = await createCompressedFileListModule(dir, options);
			} else {
				result = await createFileListModule(dir, options);
			}

			if (output) {
				await writeFile(output, result);
			} else {
				// eslint-disable-next-line no-console
				console.log(result);
			}
		},
	);

cli.help();
cli.version(version);

cli.parse();
