import { build, BuildOptions } from "esbuild";
import { builtinModules } from "module";
import fs from "fs";
import * as fsExtra from "fs-extra";

// TODO: Add callbacks to manipulate config outputs
export interface VercelBundlerOptions {
  /**
   * Output directory
   * @default ".vercel/output"
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
   * Serverless function entry file.
   * @default undefined
   */
  serverlessEntry?: string;
  /**
   * Callback for manipulating ESBuild options.
   */
  manipulateEsbuildOptions?: EsbuildOptionsFunction;
}

type EsbuildOptionsFunction = (
  options: BuildOptions,
  phase: "edge" | "serverless",
) => void | Promise<void>;

export async function bundle(options: VercelBundlerOptions = {}) {
  const {
    outputDir = ".vercel/output",
    clearOutputDir = true,
    staticDir,
    edgeEntry,
    serverlessEntry,
    manipulateEsbuildOptions,
  } = options;

  if (!staticDir && !edgeEntry && !serverlessEntry) {
    throw new Error(
      "Must provide at least one of staticDir, edgeEntry, or serverlessEntry",
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
      outputDir + "/functions/_edge.func",
      manipulateEsbuildOptions,
    );

    await fs.promises.writeFile(
      outputDir + "/functions/_edge.func/.vc-config.json",
      JSON.stringify(
        {
          runtime: "edge",
          entrypoint: "index.js",
          // TODO: Investigate and expose envVarsInUse
        },
        null,
        2,
      ),
    );
  }

  if (serverlessEntry) {
    await bundleServerlessFunction(
      serverlessEntry,
      outputDir + "/functions/index.func",
      manipulateEsbuildOptions,
    );

    await fs.promises.writeFile(
      outputDir + "/functions/index.func/.vc-config.json",
      JSON.stringify(
        {
          runtime: "nodejs16.x",
          handler: "index.js",
          launcherType: "Nodejs",
        },
        null,
        2,
      ),
    );
  }

  await createConfigFile(outputDir, {
    static: !!staticDir,
    edge: !!edgeEntry,
    serverless: !!serverlessEntry,
  });
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

  await manipulateEsbuildOptions?.(esbuildOptions, "serverless");
  await build(esbuildOptions);
}

export async function bundleServerlessFunction(
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
    format: "cjs",
    external: builtinModules,
  };

  await manipulateEsbuildOptions?.(esbuildOptions, "serverless");
  await build(esbuildOptions);
}

interface CreateConfigFileOptions {
  static: boolean;
  edge: boolean;
  serverless: boolean;
}

async function createConfigFile(
  outputDir: string,
  options: CreateConfigFileOptions,
) {
  const config = {
    version: 3,
    routes: [
      options.static && {
        handle: "filesystem",
      },
      options.edge &&
        options.serverless && {
          src: ".*",
          middlewarePath: "_edge",
          continue: true,
        },
      options.edge &&
        !options.serverless && {
          src: ".*",
          dest: "_edge",
        },
      options.serverless && {
        src: ".*",
        dest: "/",
      },
    ].filter(Boolean),
  };

  await fs.promises.writeFile(
    outputDir + "/config.json",
    JSON.stringify(config, null, 2),
  );
}
