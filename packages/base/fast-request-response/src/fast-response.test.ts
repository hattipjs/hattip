import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { FastResponse } from "./fast-response";

// Helper to create a slow async generator stream
function asyncStream(...chunks: string[]): Readable {
	async function* gen() {
		for (const chunk of chunks) {
			yield Buffer.from(chunk);
		}
	}
	return Readable.from(gen());
}

describe("constructor", () => {
	it("defaults to status 200 with empty body", () => {
		const res = new FastResponse();
		expect(res.status).toBe(200);
		expect(res.statusText).toBe("");
		expect(res.ok).toBe(true);
		expect(res.body).toBeNull();
		expect(res.bodyUsed).toBe(false);
	});

	it("accepts null body explicitly", () => {
		const res = new FastResponse(null);
		expect(res.body).toBeNull();
		expect(res.bodyUsed).toBe(false);
	});

	it("accepts status and statusText from init", () => {
		const res = new FastResponse(null, {
			status: 404,
			statusText: "Not Found",
		});
		expect(res.status).toBe(404);
		expect(res.statusText).toBe("Not Found");
		expect(res.ok).toBe(false);
	});

	it("truncates status to integer", () => {
		const res = new FastResponse(null, { status: 201.9 });
		expect(res.status).toBe(201);
	});

	it("throws RangeError for status < 200", () => {
		expect(() => new FastResponse(null, { status: 199 })).toThrow(RangeError);
	});

	it("throws RangeError for status >= 600", () => {
		expect(() => new FastResponse(null, { status: 600 })).toThrow(RangeError);
	});

	it("accepts status 599", () => {
		const res = new FastResponse(null, { status: 599 });
		expect(res.status).toBe(599);
	});

	it("throws TypeError for invalid statusText", () => {
		expect(() => new FastResponse(null, { statusText: "bad\x00text" })).toThrow(
			TypeError,
		);
	});

	it("accepts valid statusText with tabs and high bytes", () => {
		const res = new FastResponse(null, { statusText: "OK\t\x80\xff" });
		expect(res.statusText).toBe("OK\t\x80\xff");
	});

	it("sets headers from init", () => {
		const res = new FastResponse(null, {
			headers: { "x-custom": "value" },
		});
		expect(res.headers.get("x-custom")).toBe("value");
	});
});

describe("properties", () => {
	it("ok is true for 200-299", () => {
		expect(new FastResponse(null, { status: 200 }).ok).toBe(true);
		expect(new FastResponse(null, { status: 299 }).ok).toBe(true);
		expect(new FastResponse(null, { status: 300 }).ok).toBe(false);
	});
});

describe("instanceof", () => {
	it("passes instanceof Response", () => {
		const res = new FastResponse("hello");
		expect(res instanceof Response).toBe(true);
	});
});

describe("static methods", () => {
	it("json() creates a JSON response", () => {
		const res = FastResponse.json({ hello: "world" });
		expect(res.headers.get("content-type")).toBe("application/json");
		expect(res.status).toBe(200);
	});

	it("json() preserves existing content-type", () => {
		const res = FastResponse.json(
			{ a: 1 },
			{
				headers: { "content-type": "application/json; charset=utf-8" },
			},
		);
		expect(res.headers.get("content-type")).toBe(
			"application/json; charset=utf-8",
		);
	});

	it("json() accepts status in init", () => {
		const res = FastResponse.json({ error: "not found" }, { status: 404 });
		expect(res.status).toBe(404);
	});

	it("json() body can be read as text", async () => {
		const res = FastResponse.json({ hello: "world" });
		expect(await res.text()).toBe('{"hello":"world"}');
	});
});

describe("body consumption - string body", () => {
	it("text() returns the string", async () => {
		const res = new FastResponse("hello world");
		expect(await res.text()).toBe("hello world");
	});

	it("json() parses JSON string body", async () => {
		const res = new FastResponse('{"key":"value"}');
		expect(await res.json()).toEqual({ key: "value" });
	});

	it("arrayBuffer() returns encoded bytes", async () => {
		const res = new FastResponse("hello");
		const ab = await res.arrayBuffer();
		expect(Buffer.from(ab).toString()).toBe("hello");
	});

	it("blob() returns a Blob with content-type", async () => {
		const res = new FastResponse("hello", {
			headers: { "content-type": "text/plain" },
		});
		const b = await res.blob();
		expect(b.type).toBe("text/plain");
		expect(await b.text()).toBe("hello");
	});

	it("bytes() returns Uint8Array", async () => {
		const res = new FastResponse("hello");
		const b = await res.bytes();
		expect(b).toBeInstanceOf(Uint8Array);
		expect(Buffer.from(b).toString()).toBe("hello");
	});

	it("sets content-type to text/plain;charset=UTF-8 for string bodies", () => {
		const res = new FastResponse("hello");
		expect(res.headers.get("content-type")).toBe("text/plain;charset=UTF-8");
	});
});

describe("body consumption - Uint8Array body", () => {
	it("text() decodes the bytes", async () => {
		const res = new FastResponse(Buffer.from("hello"));
		expect(await res.text()).toBe("hello");
	});

	it("arrayBuffer() returns the buffer", async () => {
		const res = new FastResponse(new Uint8Array([1, 2, 3]));
		const ab = await res.arrayBuffer();
		expect(new Uint8Array(ab)).toEqual(new Uint8Array([1, 2, 3]));
	});

	it("bytes() returns the same Uint8Array for non-Buffer input", async () => {
		const original = new Uint8Array([1, 2, 3]);
		const res = new FastResponse(original);
		const result = await res.bytes();
		expect(result).toEqual(new Uint8Array([1, 2, 3]));
	});
});

describe("body consumption - Blob body", () => {
	it("text() reads the blob", async () => {
		const res = new FastResponse(new Blob(["hello"]));
		expect(await res.text()).toBe("hello");
	});

	it("blob() returns the original blob", async () => {
		const original = new Blob(["hello"], { type: "text/plain" });
		const res = new FastResponse(original);
		const result = await res.blob();
		expect(await result.text()).toBe("hello");
	});

	it("arrayBuffer() reads the blob", async () => {
		const res = new FastResponse(new Blob(["hello"]));
		const ab = await res.arrayBuffer();
		expect(Buffer.from(ab).toString()).toBe("hello");
	});
});

describe("body consumption - ReadableStream body", () => {
	it("text() reads the stream", async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(Buffer.from("hello "));
				controller.enqueue(Buffer.from("world"));
				controller.close();
			},
		});
		const res = new FastResponse(stream);
		expect(await res.text()).toBe("hello world");
	});

	it("arrayBuffer() reads the stream", async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(Buffer.from("hi"));
				controller.close();
			},
		});
		const res = new FastResponse(stream);
		const ab = await res.arrayBuffer();
		expect(Buffer.from(ab).toString()).toBe("hi");
	});
});

describe("body consumption - Node Readable body", () => {
	it("text() reads the stream", async () => {
		const res = new FastResponse(asyncStream("hello ", "world"));
		expect(await res.text()).toBe("hello world");
	});

	it("arrayBuffer() reads the stream", async () => {
		const res = new FastResponse(asyncStream("hi"));
		const ab = await res.arrayBuffer();
		expect(Buffer.from(ab).toString()).toBe("hi");
	});

	it("bytes() reads the stream", async () => {
		const res = new FastResponse(asyncStream("hi"));
		const b = await res.bytes();
		expect(Buffer.from(b).toString()).toBe("hi");
	});
});

describe("body consumption - null body", () => {
	it("text() returns empty string", async () => {
		expect(await new FastResponse().text()).toBe("");
	});

	it("arrayBuffer() returns empty ArrayBuffer", async () => {
		const ab = await new FastResponse().arrayBuffer();
		expect(ab.byteLength).toBe(0);
	});

	it("blob() returns empty Blob", async () => {
		const b = await new FastResponse().blob();
		expect(b.size).toBe(0);
	});

	it("bytes() returns empty Uint8Array", async () => {
		const b = await new FastResponse().bytes();
		expect(b.byteLength).toBe(0);
	});

	it("null body can be 'consumed' multiple times", async () => {
		const res = new FastResponse();
		expect(await res.text()).toBe("");
		expect(await res.text()).toBe("");
		expect(await res.arrayBuffer()).toEqual(new ArrayBuffer(0));
	});
});

describe("body consumption - URLSearchParams body", () => {
	it("sets content-type and reads as text", async () => {
		const params = new URLSearchParams({ foo: "bar", baz: "qux" });
		const res = new FastResponse(params);
		expect(res.headers.get("content-type")).toBe(
			"application/x-www-form-urlencoded;charset=UTF-8",
		);
		expect(await res.text()).toBe("foo=bar&baz=qux");
	});
});

describe("bodyUsed", () => {
	it("is false before consumption", () => {
		expect(new FastResponse("hello").bodyUsed).toBe(false);
	});

	it("is true after text()", async () => {
		const res = new FastResponse("hello");
		await res.text();
		expect(res.bodyUsed).toBe(true);
	});

	it("is true after arrayBuffer()", async () => {
		const res = new FastResponse("hello");
		await res.arrayBuffer();
		expect(res.bodyUsed).toBe(true);
	});

	it("is true after blob()", async () => {
		const res = new FastResponse("hello");
		await res.blob();
		expect(res.bodyUsed).toBe(true);
	});

	it("is true after bytes()", async () => {
		const res = new FastResponse("hello");
		await res.bytes();
		expect(res.bodyUsed).toBe(true);
	});

	it("is true after json()", async () => {
		const res = new FastResponse('"hello"');
		await res.json();
		expect(res.bodyUsed).toBe(true);
	});

	it("is always false for null body", async () => {
		const res = new FastResponse();
		await res.text();
		expect(res.bodyUsed).toBe(false);
	});

	it("is true after stream body is consumed", async () => {
		const res = new FastResponse(asyncStream("hello"));
		await res.text();
		expect(res.bodyUsed).toBe(true);
	});
});

describe("double consumption throws", () => {
	it("text() then text() throws", async () => {
		const res = new FastResponse("hello");
		await res.text();
		await expect(res.text()).rejects.toThrow(TypeError);
	});

	it("text() then arrayBuffer() throws", async () => {
		const res = new FastResponse("hello");
		await res.text();
		await expect(res.arrayBuffer()).rejects.toThrow(TypeError);
	});

	it("arrayBuffer() then text() throws", async () => {
		const res = new FastResponse("hello");
		await res.arrayBuffer();
		await expect(res.text()).rejects.toThrow(TypeError);
	});

	it("bytes() then blob() throws", async () => {
		const res = new FastResponse("hello");
		await res.bytes();
		await expect(res.blob()).rejects.toThrow(TypeError);
	});

	it("stream body: text() then text() throws", async () => {
		const res = new FastResponse(asyncStream("hello"));
		await res.text();
		await expect(res.text()).rejects.toThrow(TypeError);
	});
});

describe("body getter", () => {
	it("returns null for null body", () => {
		expect(new FastResponse().body).toBeNull();
	});

	it("returns a ReadableStream for string body", async () => {
		const res = new FastResponse("hello");
		const body = res.body;
		expect(body).toBeInstanceOf(ReadableStream);
	});

	it("returns a ReadableStream for Uint8Array body", async () => {
		const res = new FastResponse(new Uint8Array([1, 2, 3]));
		const body = res.body;
		expect(body).toBeInstanceOf(ReadableStream);
	});

	it("returns a ReadableStream for Blob body", async () => {
		const res = new FastResponse(new Blob(["hello"]));
		const body = res.body;
		expect(body).toBeInstanceOf(ReadableStream);
	});

	it("returns the same stream on repeated access", async () => {
		const res = new FastResponse("hello");
		const a = res.body;
		const b = res.body;
		expect(a).toBe(b);
	});
});

describe("clone()", () => {
	it("clones a string body response", async () => {
		const res = new FastResponse("hello", {
			status: 201,
			statusText: "Created",
			headers: { "x-custom": "value" },
		});
		const cloned = res.clone();

		expect(cloned.status).toBe(201);
		expect(cloned.statusText).toBe("Created");
		expect(cloned.headers.get("x-custom")).toBe("value");
		expect(await res.text()).toBe("hello");
		expect(await cloned.text()).toBe("hello");
	});

	it("clones a Uint8Array body response", async () => {
		const res = new FastResponse(new Uint8Array([1, 2, 3]));
		const cloned = res.clone();
		expect(await res.bytes()).toEqual(new Uint8Array([1, 2, 3]));
		expect(await cloned.bytes()).toEqual(new Uint8Array([1, 2, 3]));
	});

	it("clones a Blob body response", async () => {
		const res = new FastResponse(new Blob(["hello"]));
		const cloned = res.clone();
		expect(await res.text()).toBe("hello");
		expect(await cloned.text()).toBe("hello");
	});

	it("clones a null body response", async () => {
		const res = new FastResponse();
		const cloned = res.clone();
		expect(await res.text()).toBe("");
		expect(await cloned.text()).toBe("");
	});

	it("clones a Node Readable body response", async () => {
		const res = new FastResponse(asyncStream("hello ", "world"));
		const cloned = res.clone();

		const [a, b] = await Promise.all([res.text(), cloned.text()]);
		expect(a).toBe("hello world");
		expect(b).toBe("hello world");
	});

	it("clones a ReadableStream body response", async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(Buffer.from("hello"));
				controller.close();
			},
		});
		const res = new FastResponse(stream);
		const cloned = res.clone();

		const [a, b] = await Promise.all([res.text(), cloned.text()]);
		expect(a).toBe("hello");
		expect(b).toBe("hello");
	});

	it("throws on clone after body is consumed", async () => {
		const res = new FastResponse("hello");
		await res.text();
		expect(() => res.clone()).toThrow(TypeError);
	});

	it("original and clone are independent", async () => {
		const res = new FastResponse("hello");
		const cloned = res.clone();
		await res.text();
		expect(res.bodyUsed).toBe(true);
		expect(cloned.bodyUsed).toBe(false);
		expect(await cloned.text()).toBe("hello");
	});

	it("clone headers are independent", () => {
		const res = new FastResponse(null, { headers: { "x-foo": "bar" } });
		const cloned = res.clone();
		cloned.headers.set("x-foo", "baz");
		expect(res.headers.get("x-foo")).toBe("bar");
	});
});

describe("getRawBody()", () => {
	it("returns null for null body", () => {
		expect(new FastResponse().getRawBody()).toBeNull();
	});

	it("returns string for string body", () => {
		expect(new FastResponse("hello").getRawBody()).toBe("hello");
	});

	it("returns Uint8Array for Uint8Array body", () => {
		const body = new FastResponse(new Uint8Array([1, 2])).getRawBody();
		expect(body).toBeInstanceOf(Uint8Array);
	});

	it("returns Blob for Blob body", () => {
		const body = new FastResponse(new Blob(["hi"])).getRawBody();
		expect(body).toBeInstanceOf(Blob);
	});

	it("returns Readable for async iterable body", () => {
		const body = new FastResponse(asyncStream("hi")).getRawBody();
		expect(body).toBeInstanceOf(Readable);
		(body as Readable).destroy();
	});

	it("throws after body is consumed", async () => {
		const res = new FastResponse("hello");
		await res.text();
		expect(() => res.getRawBody()).toThrow(TypeError);
	});
});
