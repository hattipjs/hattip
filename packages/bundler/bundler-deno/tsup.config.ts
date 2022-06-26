import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/cli.ts"],
    format: ["cjs"],
    platform: "node",
    target: "node14",
    dts: "./src/index.ts",
  },
]);
