export function split<T>(
	input: ReadableStream<Uint8Array>,
	boundary: Uint8Array,
	boundaryRep: T,
): ReadableStream<Uint8Array | T> {
	let leftovers = 0;

	const transform = new TransformStream<Uint8Array, Uint8Array | T>({
		transform(chunk, controller) {
			let afterBoundary = leftovers ? boundary.length - leftovers : 0;
			if (leftovers) {
				for (let i = 0; i < boundary.length - leftovers; i++) {
					if (i >= chunk.length) {
						leftovers += i;
						return;
					}
					if (chunk[i] !== boundary[leftovers + i]) {
						afterBoundary = 0;
						break;
					}
				}

				if (afterBoundary) {
					controller.enqueue(boundaryRep);
				} else {
					controller.enqueue(boundary.subarray(0, leftovers));
				}
				leftovers = 0;
			}

			while (afterBoundary < chunk.length) {
				const index = findPartial(chunk, boundary, afterBoundary);
				if (index >= 0 && index <= chunk.length - boundary.length) {
					if (index > 0) {
						controller.enqueue(chunk.subarray(afterBoundary, index));
					}
					controller.enqueue(boundaryRep);
					afterBoundary = index + boundary.length;
				} else if (index >= 0) {
					leftovers = chunk.length - index;
					controller.enqueue(
						chunk.subarray(afterBoundary, chunk.length - leftovers),
					);
					break;
				} else {
					controller.enqueue(chunk.subarray(afterBoundary));
					break;
				}
			}
		},
	});

	return input.pipeThrough(transform);
}

// TODO: This function needs to be optimized.
function findPartial(
	array: Uint8Array,
	subarray: Uint8Array,
	offset: number,
): number {
	let i = offset;
	outer: for (
		i = array.indexOf(subarray[0], i);
		i >= 0;
		i = array.indexOf(subarray[0], i + 1)
	) {
		for (let j = 0; j < subarray.length; j++) {
			const value = array[i + j];
			if (value === undefined) {
				return i;
			} else if (value !== subarray[j]) {
				continue outer;
			}
		}

		return i;
	}

	return -1;
}
