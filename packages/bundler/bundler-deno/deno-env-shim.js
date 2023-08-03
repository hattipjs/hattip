/* eslint-disable */
import { Buffer as __nodeBuffer } from "node:buffer";
import {
	clearImmediate as __nodeClearImmediate,
	clearInterval as __nodeClearInterval,
	clearTimeout as __nodeClearTimeout,
	setImmediate as __nodeSetImmediate,
	setInterval as __nodeSetInterval,
	setTimeout as __nodeSetTimeout,
} from "node:timers";
import { console as __nodeConsole } from "node:console";
import { process as __nodeProcess } from "node:process";
import { performance as __nodePerformance } from "node:perf_hooks";
import { createRequire as __nodeCreateRequire } from "node:module";

Object.assign(globalThis, {
	global: globalThis,
	Buffer: __nodeBuffer,
	clearImmediate: __nodeClearImmediate,
	clearInterval: __nodeClearInterval,
	clearTimeout: __nodeClearTimeout,
	setImmediate: __nodeSetImmediate,
	setInterval: __nodeSetInterval,
	setTimeout: __nodeSetTimeout,
	console: __nodeConsole,
	process: __nodeProcess,
	performance: __nodePerformance,
	require: __nodeCreateRequire(import.meta.url),
});
