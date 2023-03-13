export function mergeChunks<T extends string>(
	input: ReadableStream<Uint8Array | T>,
): ReadableStream<Uint8Array> {
	let chunks: Uint8Array[] = [];

	const transform = new TransformStream<Uint8Array | T, Uint8Array>({
		transform: (chunk, controller) => {
			if (typeof chunk !== "string") {
				chunks.push(chunk);
			} else {
				if (chunks.length) {
					controller.enqueue(concat(...chunks));
				}
				chunks = [];
			}
		},

		flush: (controller) => {
			if (chunks.length) {
				controller.enqueue(concat(...chunks));
			}
		},
	});

	return input.pipeThrough(transform);
}

export function concat(...arrays: Uint8Array[]) {
	const length = arrays.reduce((a, b) => a + b.length, 0);
	const result = new Uint8Array(length);
	let offset = 0;
	for (const array of arrays) {
		result.set(array, offset);
		offset += array.length;
	}

	return result;
}
