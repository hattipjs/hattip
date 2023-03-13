import { describe, expect, it } from "vitest";
import { bufferSizes, examples } from "./fixtures";
import { parseMultipartFormData } from "./form-data";

describe.each(examples.slice(0, 1))(`$name`, ({ content, boundary }) => {
	it.each([bufferSizes])(
		"MultipartFormData with a buffer size of %d",
		async (bufferSize) => {
			const stream = toStream(content, bufferSize);
			const fd = await parseMultipartFormData(
				new Request("http://localhost", {
					method: "POST",
					body: stream,
					headers: {
						"Content-Type": `multipart/form-data; boundary=${boundary}`,
					},
					// @ts-expect-error: Node needs this
					duplex: "half",
				}),
				{
					async handleFile(info) {
						return {
							name: info.name,
							filename: info.filename,
							contentType: info.contentType,
							body: await readAll(info.body),
						};
					},
				},
			);

			expect([...fd.entries()]).toStrictEqual([
				["field1", "Smiley 😊"],
				["field2", "Iğdır"],
				[
					"files",
					{
						name: "files",
						filename: "Weirdly Named File 😊.txt",
						contentType: "text/plain",
						body: "Some non-ASCII content 😊\n",
					},
				],
			]);
		},
	);
});

function toStream(
	value: string,
	bufferSize: number,
): ReadableStream<Uint8Array> {
	const buffer = new TextEncoder().encode(value);
	let offset = 0;

	return new ReadableStream({
		async pull(controller) {
			controller.enqueue(buffer.slice(offset, offset + bufferSize));
			offset += bufferSize;

			if (offset >= buffer.length) {
				controller.close();
			}
		},
	});
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let done = false;
	while (!done) {
		const { value, done: d } = await reader.read();
		if (value) {
			chunks.push(value);
		}
		done = d;
	}
	return new TextDecoder().decode(Buffer.concat(chunks));
}
