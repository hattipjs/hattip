// @ts-check
import lagonAdapter from "@hattip/adapter-lagon";
import hattipHandler from ".";

globalThis.setTimeout = (callback) => Promise.resolve().then(callback);

export const handler = lagonAdapter(hattipHandler);
