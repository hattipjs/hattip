import { cac } from "cac";
import { version } from "../package.json";
import bundler from ".";

const cli = cac("hattip-deno");

cli
  .command(
    "<input> <output>",
    "Bundle the HatTip app in <input> into <output> as a Deno module",
  )
  .option(
    "-s, --staticDir <dir>",
    "Static files directory to copy next to the output",
  )
  .action(
    async (
      input: string,
      output: string,
      { staticDir }: { staticDir?: string },
    ) => {
      await bundler({ input, output, staticDir });
    },
  );

cli.help();
cli.version(version);

cli.parse();
