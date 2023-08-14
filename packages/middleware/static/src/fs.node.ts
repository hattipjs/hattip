import { createReadStream } from "node:fs";
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
		// Readable is fine here but types don't allow it
		return createReadStream(root + "/" + file.path) as any;
	};
}
