// @ts-check

import { createListener } from "@hattip/adapter-node";
import handler from "./index.js";

export default createListener(handler);
