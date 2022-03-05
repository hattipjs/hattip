import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "./src/index.ts",
      "./src/simple-server.ts",
      "./src/full-stack-server.ts",
    ],
    format: ["esm", "cjs"],
    platform: "node",
    target: "node14",
    dts: true,
  },
]);
