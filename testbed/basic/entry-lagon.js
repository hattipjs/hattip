// @ts-check
import lagonAdapter from "@hattip/adapter-lagon";
import hattipHandler from "./index.js";

export const handler = lagonAdapter(hattipHandler);
