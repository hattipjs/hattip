/* eslint-disable @typescript-eslint/ban-ts-comment */
import { fileURLToPath } from "node:url";
import type { ReadOnlyFile } from ".";

/**
 * File read adapter
 */
export function createFileReader(root: string | URL = Deno.cwd()) {
	if (root instanceof URL || root.startsWith("file://")) {
		root = fileURLToPath(root);
	}

	return function read(
		_ctx: any,
		file: ReadOnlyFile,
	): BodyInit | Promise<BodyInit> {
		// @ts-ignore: Deno types
		return Deno.open(root + "/" + file.path).then((file) => file.readable);
	};
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Deno {
		function cwd(): string;
	}
}
