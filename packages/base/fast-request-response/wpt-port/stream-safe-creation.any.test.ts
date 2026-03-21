import { it, describe, afterEach } from "vitest";
import { FastResponse } from "../src/fast-response";

// These tests verify that stream creation is not affected by changes to
// Object.prototype.

// const href = `data:,Hello%2C%20World%21`;

const creationCases = {
	// fetch: async () => fetch(href),
	// request: () => new Request(href, { method: "POST", body: "hi" }),
	response: () => new Response("bye"),
	consumeEmptyResponse: () => new FastResponse().text(),
	consumeNonEmptyResponse: () => new FastResponse(new Uint8Array([64])).text(),
	// consumeEmptyRequest: () => new Request(href).text(),
	// consumeNonEmptyRequest: () =>
	// 	new Request(href, { method: "POST", body: "yes" }).arrayBuffer(),
};

describe.each(Object.entries(creationCases))(`%s`, (creationCase, fn) => {
	describe.each([["start"], ["type"], ["size"], ["highWaterMark"]])(
		`%s`,
		(accessorName) => {
			afterEach(() => {
				delete (Object.prototype as any)[accessorName];
			});

			it(
				`throwing Object.prototype.${accessorName} accessor should not affect ` +
					`stream creation by '${creationCase}'`,
				async () => {
					Object.defineProperty(Object.prototype, accessorName, {
						get() {
							throw Error(`Object.prototype.${accessorName} was accessed`);
						},
						configurable: true,
					});

					await fn();
				},
			);
		},
	);
});

/*
for (const creationCase of Object.keys(creationCases)) {
	for (const accessorName of ["start", "type", "size", "highWaterMark"]) {
		promise_test(
			async (t) => {
				Object.defineProperty(Object.prototype, accessorName, {
					get() {
						throw Error(`Object.prototype.${accessorName} was accessed`);
					},
					configurable: true,
				});
				t.add_cleanup(() => {
					delete Object.prototype[accessorName];
					return Promise.resolve();
				});
				await creationCases[creationCase]();
			},
			`throwing Object.prototype.${accessorName} accessor should not affect ` +
				`stream creation by '${creationCase}'`,
		);

		promise_test(
			async (t) => {
				// -1 is a convenient value which is invalid, and should cause the
				// constructor to throw, for all four fields.
				Object.prototype[accessorName] = -1;
				t.add_cleanup(() => {
					delete Object.prototype[accessorName];
					return Promise.resolve();
				});
				await creationCases[creationCase]();
			},
			`Object.prototype.${accessorName} accessor returning invalid value ` +
				`should not affect stream creation by '${creationCase}'`,
		);
	}

	promise_test(
		async (t) => {
			Object.prototype.start = (controller) =>
				controller.error(new Error("start"));
			t.add_cleanup(() => {
				delete Object.prototype.start;
				return Promise.resolve();
			});
			await creationCases[creationCase]();
		},
		`Object.prototype.start function which errors the stream should not ` +
			`affect stream creation by '${creationCase}'`,
	);
}
*/
