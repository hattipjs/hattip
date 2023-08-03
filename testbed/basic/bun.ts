declare global {
	interface Headers {
		__entries?: [string, string][];
	}
}

// @ts-ignore
if (typeof Bun !== "undefined") {
	const originalEntries = Headers.prototype.entries;

	Headers.prototype.append = function append(key: string, value: string) {
		this.__entries = this.__entries ?? [...originalEntries.call(this)];
		this.__entries.push([key, value]);
	};

	Headers.prototype.entries = function entries() {
		return this.__entries ?? originalEntries.call(this);
	};

	Headers.prototype[Symbol.iterator] = function* () {
		yield* this.entries();
	};
}

export {};

const headers = new Headers({
	"Content-Type": "text/plain; charset=utf-8",
});

headers.append("Set-Cookie", "foo=bar");

const entries = [...headers];

console.log(entries);
