// @ts-check
import adapterVercel from "@hattip/adapter-vercel-edge";
import handler from "./index.js";

export default adapterVercel(handler);
