import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/cli.ts"],
    format: ["esm"],
    platform: "node",
    target: "node14",
  },
  {
    entry: ["./src/index.ts"],
    format: ["cjs"],
    platform: "node",
    target: "node14",
    dts: true,
  },
]);
