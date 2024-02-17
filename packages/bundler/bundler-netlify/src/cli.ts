import { cac } from "cac";
import { version } from "../package.json";
import { bundle } from ".";

const cli = cac("hattip-netlify");

cli
	.command("", "Bundle a Hattip app for Netlify")
	.option("-o, --outputDir <path>", "Root directory of the app")
	.option("-c, --clearOutputDir", "Clear the output directory before bundling")
	.option("-s, --staticDir <path>", "Static directory to copy to output")
	.option("-e, --edge <path>", "Edge function entry file")
	.option("-S, --func <path>", "Regular function entry file")
	.action(
		async (options: {
			outputDir: string;
			clearOutputDir: boolean;
			staticDir: string;
			edge: string;
			func: string;
		}) => {
			await bundle({
				outputDir: options.outputDir,
				clearOutputDir: options.clearOutputDir,
				staticDir: options.staticDir,
				edgeEntry: options.edge,
				functionEntry: options.func,
			});
		},
	);

cli.help();
cli.version(version);

cli.parse();
