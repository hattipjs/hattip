// @ts-check
import adapterNetlifyEdge from "@hattip/adapter-netlify-edge";
import handler from "./index.js";

export default adapterNetlifyEdge(handler);

export const config = {
	path: "/*",
};
