// @ts-check
import lagonAdapter from "@hattip/adapter-lagon";
import hattipHandler from ".";

export const handler = lagonAdapter(hattipHandler);
