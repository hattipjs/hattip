/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { HattipHandler } from "@hattip/core";

export interface DenoPlatformInfo {
	name: "deno";
	// @ts-ignore
	info: Deno.ServeHandlerInfo;
}

// @ts-ignore
export function createServeHandler(handler: HattipHandler): Deno.ServeHandler;
