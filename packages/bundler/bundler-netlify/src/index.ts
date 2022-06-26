import { build, BuildOptions } from "esbuild";
import { builtinModules } from "module";
import fs from "fs";
import * as fsExtra from "fs-extra";

// TODO: Add callbacks to manipulate config outputs
export interface NetlifyBundlerOptions {
  /**
   * Output directory
   * @default "netlify"
   */
  outputDir?: string;
  /**
   * Whether to clear the output directory if it exists.
   * @default true
   */
  clearOutputDir?: boolean;
  /**
   * Static files directory to copy to the output.
   * @default undefined
   */
  staticDir?: string;
  /**
   * Edge function entry file.
   * @default undefined
   */
  edgeEntry?: string;
  /**
   * Regular function entry file.
   * @default undefined
   */
  functionEntry?: string;
  /**
   * Callback for manipulating ESBuild options.
   */
  manipulateEsbuildOptions?: EsbuildOptionsFunction;
}

type EsbuildOptionsFunction = (
  options: BuildOptions,
  phase: "edge" | "regular",
) => void | Promise<void>;

export async function bundle(options: NetlifyBundlerOptions = {}) {
  const {
    outputDir = "netlify",
    clearOutputDir = true,
    staticDir,
    edgeEntry,
    functionEntry,
    manipulateEsbuildOptions,
  } = options;

  if (!staticDir && !edgeEntry && !functionEntry) {
    throw new Error(
      "Must provide at least one of staticDir, edgeEntry, or functionEntry",
    );
  }

  if (clearOutputDir && fs.existsSync(outputDir)) {
    await fs.promises.rm(outputDir, { recursive: true, force: true });
  }

  await fs.promises.mkdir(outputDir, { recursive: true });

  if (staticDir) {
    await fsExtra.copy(staticDir, outputDir + "/static");
  }

  if (edgeEntry) {
    await bundleEdgeFunction(
      edgeEntry,
      outputDir + "/edge-functions/edge",
      manipulateEsbuildOptions,
    );
  }

  if (functionEntry) {
    await bundleRegularFunction(
      functionEntry,
      outputDir + "/functions/function",
      manipulateEsbuildOptions,
    );

    await fs.promises.writeFile(
      outputDir + "/static/_redirects",
      "/*  /.netlify/functions/function  200\n",
    );
  }
}

export async function bundleEdgeFunction(
  entry: string,
  outputDir: string,
  manipulateEsbuildOptions?: EsbuildOptionsFunction,
) {
  const esbuildOptions: BuildOptions = {
    logLevel: "info",
    bundle: true,
    minify: true,
    entryPoints: [entry],
    outfile: outputDir + "/index.js",
    platform: "browser",
    target: "chrome96",
    format: "esm",
    mainFields: ["module", "main", "browser"],
    conditions: ["worker", "import", "require"],
    external: builtinModules,
  };

  await manipulateEsbuildOptions?.(esbuildOptions, "regular");
  await build(esbuildOptions);
}

export async function bundleRegularFunction(
  entry: string,
  outputDir: string,
  manipulateEsbuildOptions?: EsbuildOptionsFunction,
) {
  const esbuildOptions: BuildOptions = {
    logLevel: "info",
    bundle: true,
    minify: true,
    entryPoints: [entry],
    outfile: outputDir + "/index.js",
    platform: "node",
    target: "node16",
    format: "esm",
    external: builtinModules,
  };

  await manipulateEsbuildOptions?.(esbuildOptions, "regular");
  await build(esbuildOptions);
}
