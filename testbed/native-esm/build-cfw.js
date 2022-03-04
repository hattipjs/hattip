import bundler from "@hattip/bundler-cloudflare-workers";

bundler({
  entry: "entry-cfw.js",
  output: "dist/cloudflare-workers-bundle/index.js",
});
