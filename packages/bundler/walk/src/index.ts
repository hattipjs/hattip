import { lookup } from "mime-types";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { normalizePathSegment } from "./url";
import { Buffer } from "node:buffer";

export interface WalkOptions {
	/**
	 * Whether to calculate the etag for each file.
	 * @default true
	 */
	etag?: boolean;
	/**
	 * A list of file and directory names to ignore.
	 * @default ["node_modules","dist",/^\.(?!well-known$)/]
	 */
	prune?: (string | RegExp)[];
	/**
	 * A function to get the mime type of a file.
	 * @default import("mime-types").lookup
	 */
	getType?: (name: string) => string | false;
}

export interface FileInfo {
	readonly path: string;
	readonly type: string;
	readonly size: number;
	readonly etag?: string;
}

export function walk(
	dir: string | URL,
	options: WalkOptions = {},
): Map<string, FileInfo> {
	if (dir instanceof URL || dir.startsWith("file:")) {
		dir = fileURLToPath(dir);
	}

	return doWalk(
		new Map<string, FileInfo>(),
		dir,
		"",
		"",

		{
			etag: options.etag ?? true,
			prune: options.prune ?? ["node_modules", "dist", /^\.(?!well-known$)/],
			getType: options.getType ?? lookup,
		},
	);
}

function doWalk(
	entries: Map<string, FileInfo>,
	dir: string,
	parent: string,
	normalizedParent: string,
	options: Required<WalkOptions>,
): Map<string, FileInfo> {
	const files = fs.readdirSync(dir);

	for (const file of files) {
		if (options.prune.some((p) => file === p || file.match(p))) {
			continue;
		}

		const normalizedFile = normalizePathSegment(file);

		let stat: fs.Stats;
		const filepath = path.join(dir, file);
		const relativePath = parent + "/" + file;

		try {
			stat = fs.statSync(filepath);
		} catch (error: any) {
			if (error?.code === "ENOENT") {
				continue;
			}

			throw error;
		}

		if (stat.isSymbolicLink()) {
			continue;
		}

		if (stat.isDirectory()) {
			doWalk(
				entries,
				filepath,
				relativePath,
				normalizedParent + "/" + normalizedFile,
				options,
			);
		} else if (stat.isFile()) {
			let etag: string | undefined;
			if (options.etag) {
				// Get file hash
				etag = hashSync(filepath);
			}

			entries.set(normalizedParent + "/" + normalizedFile, {
				path: relativePath,
				type: options.getType(filepath) || "application/octet-stream",
				size: stat.size,
				etag,
			});
		}
	}

	return entries;
}

export function createFileSet(dir: string, options?: WalkOptions) {
	const files = walk(dir, options);
	return new Set(files.keys());
}

export function createFileSetModule(dir: string, options?: WalkOptions) {
	const files = createFileSet(dir, options);
	return `export default new Set(${JSON.stringify([...files])});`;
}

export function createFileMap(dir: string, options?: WalkOptions) {
	const files = walk(dir, options);
	return new Map(
		[...files].map(([name, stat]) => [
			name,
			name === stat.path ? undefined : stat.path,
		]),
	);
}

export function createFileMapModule(dir: string, options?: WalkOptions) {
	const files = createFileMap(dir, options);
	const joined = [...files].map(stringifyTuple).join(",");
	return `export default new Map([${joined}]);`;
}

export function createFileList(
	dir: string,
	options?: WalkOptions,
): Array<
	[
		name: string,
		path: string | undefined,
		type: string,
		size: number,
		etag?: string,
	]
> {
	const files = walk(dir, options);

	if (options?.etag === false) {
		return [...files].map(([name, stat]) => [
			name,
			name === stat.path ? undefined : stat.path,
			stat.type,
			stat.size,
		]);
	} else {
		return [...files].map(([name, stat]) => [
			name,
			name === stat.path ? undefined : stat.path,
			stat.type,
			stat.size,
			stat.etag,
		]);
	}
}

export function createFileListModule(dir: string, options?: WalkOptions) {
	const files = createFileList(dir, options);
	const joined = files.map((file) => stringifyTuple(file)).join(",");
	return `export default [${joined}];`;
}

export function createCompressedFileListModule(
	dir: string,
	options?: WalkOptions,
) {
	const files = createFileList(dir, options);
	const types = new Map<string, number>();
	const output: Array<
		[
			name: string,
			path: string | undefined,
			typeIndex: number,
			size: number,
			etag?: string,
		]
	> = [];

	for (const [name, path, type, size, etag] of files) {
		let typeIndex = types.get(type);
		if (typeIndex === undefined) {
			typeIndex = types.size;
			types.set(type, typeIndex);
		}

		output.push(
			etag
				? [name, name === path ? undefined : path, typeIndex, size, etag]
				: [name, name === path ? undefined : path, typeIndex, size],
		);
	}

	const joined = output.map((file) => stringifyTuple(file)).join(",");

	return `export default {types: ${JSON.stringify([
		...types.keys(),
	])}, files: [${joined}]};`;
}

function stringifyTuple(tuple: any[]) {
	return `[${tuple
		.map((value) => (value === undefined ? "" : JSON.stringify(value)))
		.join(",")}]`;
}

function hashSync(filepath: string) {
	const hash = createHash("md5");
	const buffer = Buffer.alloc(64 * 1024);
	const fd = fs.openSync(filepath, "r");

	for (;;) {
		const bytesRead = fs.readSync(fd, buffer, {});
		if (bytesRead === 0) {
			break;
		}

		hash.update(buffer.subarray(0, bytesRead));
	}

	return hash.digest("hex");
}
