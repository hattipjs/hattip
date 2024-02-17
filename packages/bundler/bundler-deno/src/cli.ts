import { cac } from "cac";
import { version } from "../package.json";
import bundler from ".";

const cli = cac("hattip-deno");

cli
	.command(
		"<input> <output>",
		"Bundle the Hattip app in <input> into <output> as a Deno module",
	)
	.option(
		"-s, --staticDir <dir>",
		"Static files directory to copy next to the output",
	)
	.option(
		"-n, --nodeCompat",
		"Enable Node.js compatibility (e.g. polyfilling Node.js globals)",
		{ default: false },
	)
	.action(
		async (
			input: string,
			output: string,
			{ staticDir, nodeCompat }: { staticDir?: string; nodeCompat?: boolean },
		) => {
			await bundler({ input, output, staticDir, nodeCompat });
		},
	);

cli.help();
cli.version(version);

cli.parse();
