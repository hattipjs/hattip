import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import type { FileInfo } from ".";

export interface ReadOnlyFile {
	readonly type: string;
	readonly size: number;
	readonly etag?: string;
	stream(): ReadableStream<Uint8Array>;
}

export function createReadOnlyFs(
	files: Map<string, FileInfo>,
): Map<string, ReadOnlyFile> {
	return new Map(
		Array.from(files.entries()).map(([name, file]) => [
			name,
			{
				type: file.type,
				size: file.size,
				etag: file.etag,
				stream: () =>
					Readable.toWeb(
						createReadStream(file.path),
					) as ReadableStream<Uint8Array>,
			},
		]),
	);
}
