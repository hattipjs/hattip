import { expect, it } from "vitest";
import { split } from "./split";
import { mergeChunks } from "./utils";

it("should split simple chunk", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 5, 6, 10, 11]),
	);
	const boundary = new Uint8Array([5, 6]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));
	expect(output).toEqual([
		new Uint8Array([0, 1, 2, 3, 4]),
		new Uint8Array([7, 8, 9]),
		new Uint8Array([10, 11]),
	]);
});

it("should split accross chunks", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([6, 7, 8, 9]),
	);
	const boundary = new Uint8Array([5, 6]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([
		new Uint8Array([0, 1, 2, 3, 4]),
		new Uint8Array([7, 8, 9]),
	]);
});

it("should split when boundary is larger than chunk", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([6, 7]),
		new Uint8Array([8, 9, 10, 11]),
	);
	const boundary = new Uint8Array([5, 6, 7, 8]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([
		new Uint8Array([0, 1, 2, 3, 4]),
		new Uint8Array([9, 10, 11]),
	]);
});

it("should split when boundary is larger than chunk to the right", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([6, 7]),
		new Uint8Array([8, 9, 10, 11]),
	);
	const boundary = new Uint8Array([6, 7, 8]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([9, 10, 11]),
	]);
});

it("should split when the whole chunk is a boundary", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([6, 7]),
		new Uint8Array([8, 9, 10, 11]),
	);
	const boundary = new Uint8Array([6, 7]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([8, 9, 10, 11]),
	]);
});

it("should cope with false leftovers", async () => {
	const parts = stream(
		new Uint8Array([0, 1, 2, 3, 4, 5]),
		new Uint8Array([7, 8, 9]),
	);

	const boundary = new Uint8Array([5, 6]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([new Uint8Array([0, 1, 2, 3, 4, 5, 7, 8, 9])]);
});

it("should split at the end", async () => {
	const parts = stream(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
	const boundary = new Uint8Array([7, 8, 9]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([new Uint8Array([0, 1, 2, 3, 4, 5, 6])]);
});

it("should split at the start", async () => {
	const parts = stream(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
	const boundary = new Uint8Array([0, 1]);
	const output = await toArray(mergeChunks(split(parts, boundary, "boundary")));

	expect(output).toEqual([new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9])]);
});

function stream<T>(...iterable: T[]): ReadableStream<T> {
	return new ReadableStream({
		async pull(controller) {
			for (const i of iterable) controller.enqueue(i);
			controller.close();
		},
	});
}

async function toArray<T>(input: ReadableStream<T>) {
	const result = [];
	const reader = input.getReader();
	let done = false;
	while (!done) {
		const { value, done: d } = await reader.read();
		done = d;

		if (value) result.push(value);
	}

	return result;
}
