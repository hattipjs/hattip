import { lookup } from "mime-types";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { normalizePathSegment } from "./url";

export interface StatOptions {
	etag?: boolean;
	prune?: (string | RegExp)[];
	getType?: (name: string) => string | false;
}

export interface FileInfo {
	readonly path: string;
	readonly type: string;
	readonly size: number;
	readonly etag?: string;
}

export async function walk(
	dir: string,
	options: StatOptions = {},
): Promise<Map<string, FileInfo>> {
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

async function doWalk(
	entries: Map<string, FileInfo>,
	dir: string,
	parent: string,
	normalizedParent: string,
	options: Required<StatOptions>,
): Promise<Map<string, FileInfo>> {
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
			await doWalk(
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
				const hash = createHash("sha256");
				const stream = fs.createReadStream(filepath);
				await pipeline(stream, hash);
				etag = hash.digest("hex");
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

export async function createFileSet(dir: string, options?: StatOptions) {
	const files = await walk(dir, options);
	return new Set(files.keys());
}

export async function createFileSetModule(dir: string, options?: StatOptions) {
	const files = await createFileSet(dir, options);
	return `export default new Set(${JSON.stringify([...files])});`;
}

export async function createFileMap(dir: string, options?: StatOptions) {
	const files = await walk(dir, options);
	return new Map(
		[...files].map(([name, stat]) => [
			name,
			name === stat.path ? undefined : stat.path,
		]),
	);
}

export async function createFileMapModule(dir: string, options?: StatOptions) {
	const files = await createFileMap(dir, options);
	const joined = [...files].map(stringifyTuple).join(",");
	return `export default new Map([${joined}]);`;
}

export async function createFileList(
	dir: string,
	options?: StatOptions,
): Promise<
	Array<
		[
			name: string,
			path: string | undefined,
			type: string,
			size: number,
			etag?: string,
		]
	>
> {
	const files = await walk(dir, options);

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

export async function createFileListModule(dir: string, options?: StatOptions) {
	const files = await createFileList(dir, options);
	const joined = files.map((file) => stringifyTuple(file)).join(",");
	return `export default [${joined}];`;
}

export async function createCompressedFileListModule(
	dir: string,
	options?: StatOptions,
) {
	const files = await createFileList(dir, options);
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
