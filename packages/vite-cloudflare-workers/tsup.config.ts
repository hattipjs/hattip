import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    platform: "node",
    target: "node14",
    dts: true,
  },
  {
    entry: ["./src/default-entry.mjs", "./src/static-assets-entry.mjs"],
    format: ["esm"],
    shims: false,
    target: "node14",
    external: ["virtual:hattip:handler-entry", "__STATIC_CONTENT_MANIFEST"],
  },
]);
