import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/native-fetch.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    target: "node14",
    dts: true,
  },
]);
