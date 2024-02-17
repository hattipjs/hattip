import { cac } from "cac";
import { version } from "../package.json";
import bundler from ".";

const cli = cac("hattip-cloudflare-workers");

cli
	.command(
		"<input> <output>",
		"Bundle the Hattip app in <input> into <output> as a Clourflare Workers module",
	)
	.option(
		"-e, --entry",
		"Interpret <input> as a Cloudflare Workers module entry instead of a Hattip handler entry",
	)
	.option("--no-static", "Do not serve static files")
	.action(
		async (
			input: string,
			output: string,
			options: {
				entry: boolean;
				static: boolean;
			},
		) => {
			await bundler({
				cfwEntry: options.entry ? input : undefined,
				handlerEntry: options.entry ? undefined : input,
				serveStaticFiles: options.entry ? undefined : options.static,
				output,
			});
		},
	);

cli.help();
cli.version(version);

cli.parse();
