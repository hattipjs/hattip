// @ts-check

import { createServer } from "@hattip/adapter-node";
import handler from "./index.js";

createServer(handler, {
  staticAssetsDir: "public",
  useNativeFetch: process.env.USE_NATIVE_FETCH === "true",
}).listen(3000, "localhost", () => {
  console.log("Server listening on http://localhost:3000");
});
