/* eslint-disable */
globalThis.process = globalThis.process || {};
globalThis.process.env = Deno.env.toObject();
