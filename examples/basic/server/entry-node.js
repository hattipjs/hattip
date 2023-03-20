import { createServer } from "@hattip/adapter-node";
import handler from "./index.js";

const PORT = 3000;

createServer(handler).listen(PORT);

console.log(`Serving http://localhost:${PORT}`);
