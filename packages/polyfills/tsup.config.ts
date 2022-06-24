import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/node-fetch.ts", "./src/get-set-cookie.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    target: "node14",
    dts: true,
  },
]);
