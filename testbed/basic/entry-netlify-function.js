// @ts-check
import netlifyFunctionsAdapter from "@hattip/adapter-netlify-functions";
import hattipHandler from "./index.js";

export const handler = netlifyFunctionsAdapter(hattipHandler);
