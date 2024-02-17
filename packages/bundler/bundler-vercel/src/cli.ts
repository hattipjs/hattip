import { cac } from "cac";
import { version } from "../package.json";
import { bundle } from ".";

const cli = cac("hattip-vercel");

cli
	.command("", "Bundle a Hattip app for Vercel")
	.option("-o, --outputDir <path>", "Root directory of the app")
	.option("-c, --clearOutputDir", "Clear the output directory before bundling")
	.option("-s, --staticDir <path>", "Static directory to copy to output")
	.option("-e, --edge <path>", "Edge function entry file")
	.option("-S, --serverless <path>", "Serverless function entry file")
	.option(
		"--no-streaming",
		"Disable response streaming in serverless functions",
	)
	.action(
		async (options: {
			outputDir: string;
			clearOutputDir: boolean;
			staticDir: string;
			edge: string;
			serverless: string;
			streaming: boolean;
		}) => {
			await bundle({
				outputDir: options.outputDir,
				clearOutputDir: options.clearOutputDir,
				staticDir: options.staticDir,
				edgeEntry: options.edge,
				serverlessEntry: options.serverless,
				streaming: options.streaming,
			});
		},
	);

cli.help();
cli.version(version);

cli.parse();
