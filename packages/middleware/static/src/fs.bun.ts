/* eslint-disable @typescript-eslint/ban-ts-comment */
import { fileURLToPath } from "node:url";
import type { ReadOnlyFile } from ".";

/**
 * File read adapter
 */
export function createFileReader(root: string | URL = process.cwd()) {
	if (root instanceof URL || root.startsWith("file://")) {
		root = fileURLToPath(root);
	}

	return function read(
		_ctx: any,
		file: ReadOnlyFile,
	): BodyInit | Promise<BodyInit> {
		// @ts-ignore: Bun types
		return Bun.file(root + "/" + file.path);
	};
}
