import { describe, expect, it } from "vitest";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import { parseMultipart, parsePartHeaders, splitMultipart } from "./multipart";
import { bufferSizes, examples } from "./fixtures";

installNodeFetch();

const EXPECTED = [
	{
		headers: [["content-disposition", 'form-data; name="field1"']],
		body: "Smiley 😊",
	},
	{
		headers: [["content-disposition", 'form-data; name="field2"']],
		body: "Iğdır",
	},
	{
		headers: [
			[
				"content-disposition",
				'form-data; name="files"; filename="Weirdly Named File 😊.txt"',
			],
			["content-type", "text/plain"],
		],
		body: "Some non-ASCII content 😊\n",
	},
];

describe.each(examples)(`$name`, ({ content, boundary }) => {
	it.each([])("splitMultipart with a buffer size of %d", async (bufferSize) => {
		const stream = toStream(content, bufferSize);
		const splat = splitMultipart(stream, boundary);
		const parts: string[] = [""];
		let decoder = new TextDecoder();
		for (const part of await collect(splat)) {
			if (part === "part-boundary") {
				parts.push("");
				decoder = new TextDecoder();
				continue;
			}

			parts[parts.length - 1] += decoder.decode(part, {
				stream: true,
			});
		}
		decoder.decode();

		if (parts[parts.length - 1] === "") {
			parts.pop();
		}

		const manual = content
			.split("--" + boundary)
			.slice(1, -1)
			.map((s) => s.slice(2));

		expect(parts).toEqual(manual);
	});

	it.each([])(
		"parsePartHeaders with a buffer size of %d",
		async (bufferSize) => {
			const stream = toStream(content, bufferSize);

			const parsed = parsePartHeaders(stream, {
				boundaryText: boundary,
				createLimitError: (name) => new Error(`${name} limit`),
				maxHeaderCount: 1024,
				maxHeaderSize: 8192,
				maxParts: 1024,
				maxTotalHeaderSize: 8192,
			});

			const assembledParts: Array<{
				headers: Array<[string, string]>;
				body: string;
			}> = [];

			const reader = parsed.getReader();
			let decoder: TextDecoder | undefined;

			for (;;) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				if (value instanceof Map) {
					assembledParts.push({
						headers: [...value.entries()],
						body: "",
					});
					decoder?.decode();
					decoder = new TextDecoder();

					continue;
				}

				assembledParts[assembledParts.length - 1].body += decoder!.decode(
					value,
					{ stream: true },
				);
			}
			decoder?.decode();

			expect(assembledParts).toEqual(EXPECTED);
		},
	);

	it.each(bufferSizes)(
		"should work with a buffer size of %d",
		async (bufferSize) => {
			const stream = toStream(content, bufferSize);

			const parsed = parseMultipart(stream, {
				boundaryText: boundary,
				maxHeaderCount: 1024,
				maxHeaderSize: 8192,
				maxParts: 1024,
			});

			const assembledParts: Array<{
				headers: Array<[string, string]>;
				body: string;
			}> = [];

			for await (const part of parsed) {
				const chunks = await collect(part.body);
				const decoder = new TextDecoder();
				let body = "";
				for (const chunk of chunks) {
					body += decoder.decode(chunk, { stream: true });
				}

				assembledParts.push({
					headers: [...part.headers.entries()],
					body,
				});
			}

			expect(assembledParts).toEqual(EXPECTED);
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

async function collect<T>(stream: ReadableStream<T>) {
	const reader = stream.getReader();
	const result: T[] = [];

	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		result.push(value);
	}

	return result;
}
