import { describe, it, expect } from "vitest";
import { cors } from ".";
import { compose } from "@hattip/compose";
import installNodeFetch from "@hattip/polyfills/node-fetch";
import { json } from "@hattip/response";
import { HattipHandler } from "@hattip/core";
import { createTestClient } from "@hattip/adapter-test";

installNodeFetch();

describe("default options", function () {
	const app = compose(cors(), () => json({ foo: "bar" }));

	it("should not set `Access-Control-Allow-Origin` when request Origin header missing", async () => {
		await request(app)
			.get("/")
			.expect({ foo: "bar" })
			.expect(200, function (res) {
				assert(!res.headers["access-control-allow-origin"]);
			});
	});

	it("should set `Access-Control-Allow-Origin` to request origin header", async () => {
		await request(app)
			.get("/")
			.set("Origin", "http://koajs.com")
			.expect("Access-Control-Allow-Origin", "http://koajs.com")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should 204 on Preflight Request", async () => {
		await request(app)
			.options("/")
			.set("Origin", "http://koajs.com")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Allow-Origin", "http://koajs.com")
			.expect("Access-Control-Allow-Methods", "GET,HEAD,PUT,POST,DELETE,PATCH")
			.expect(204);
	});

	it("should not Preflight Request if request missing Access-Control-Request-Method", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.expect(200);
	});

	it("should always set `Vary` to Origin", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Vary", "Origin")
			.expect({ foo: "bar" })
			.expect(200);
	});
});

describe("options.origin=*", function () {
	const app = compose(
		cors({
			origin: "*",
		}),
		() => json({ foo: "bar" }),
	);

	it("should always set `Access-Control-Allow-Origin` to *", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Allow-Origin", "*")
			.expect({ foo: "bar" })
			.expect(200);
	});
});

describe("options.secureContext=true", function () {
	const app = compose(
		cors({
			secureContext: true,
		}),
		() => json({ foo: "bar" }),
	);

	it("should always set `Cross-Origin-Opener-Policy` & `Cross-Origin-Embedder-Policy` on not OPTIONS", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Cross-Origin-Opener-Policy", "same-origin")
			.expect("Cross-Origin-Embedder-Policy", "require-corp")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should always set `Cross-Origin-Opener-Policy` & `Cross-Origin-Embedder-Policy` on OPTIONS", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Cross-Origin-Opener-Policy", "same-origin")
			.expect("Cross-Origin-Embedder-Policy", "require-corp")
			.expect(204);
	});
});

describe("options.secureContext=false", function () {
	const app = compose(
		cors({
			secureContext: false,
		}),
		() => json({ foo: "bar" }),
	);

	it("should not set `Cross-Origin-Opener-Policy` & `Cross-Origin-Embedder-Policy`", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, (res) => {
				assert(!("Cross-Origin-Opener-Policy" in res.headers));
				assert(!("Cross-Origin-Embedder-Policy" in res.headers));
			});
	});
});

describe("options.origin=function", function () {
	const app = compose(
		cors({
			origin(ctx) {
				if (ctx.url.pathname === "/forbin") {
					return false;
				}
				return "*";
			},
		}),
		() => json({ foo: "bar" }),
	);

	it("should disable cors", async () => {
		await request(app)
			.get("/forbin")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, function (res) {
				assert(!res.headers["access-control-allow-origin"]);
			});
	});

	it("should set access-control-allow-origin to *", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect("Access-Control-Allow-Origin", "*")
			.expect(200);
	});
});

describe("options.origin=async function", function () {
	const app = compose(
		cors({
			async origin(ctx) {
				if (ctx.url.pathname === "/forbin") {
					return false;
				}
				return "*";
			},
		}),
		() => json({ foo: "bar" }),
	);

	it("should disable cors", async () => {
		await request(app)
			.get("/forbin")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, function (res) {
				assert(!res.headers["access-control-allow-origin"]);
			});
	});

	it("should set access-control-allow-origin to *", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect("Access-Control-Allow-Origin", "*")
			.expect(200);
	});
});

describe("options.exposeHeaders", function () {
	it("should Access-Control-Expose-Headers: `content-length`", async () => {
		const app = compose(
			cors({
				exposeHeaders: "content-length",
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Expose-Headers", "content-length")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should work with array", async () => {
		const app = compose(
			cors({
				exposeHeaders: ["content-length", "x-header"],
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Expose-Headers", "content-length,x-header")
			.expect({ foo: "bar" })
			.expect(200);
	});
});

describe("options.maxAge", function () {
	it("should set maxAge with number", async () => {
		const app = compose(
			cors({
				maxAge: 3600,
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Max-Age", "3600")
			.expect(204);
	});

	it("should set maxAge with string", async () => {
		const app = compose(
			cors({
				maxAge: "3600",
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Max-Age", "3600")
			.expect(204);
	});

	it("should not set maxAge on simple request", async () => {
		const app = compose(
			cors({
				maxAge: "3600",
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, function (res) {
				assert(!res.headers["access-control-max-age"]);
			});
	});
});

describe("options.credentials", function () {
	const app = compose(
		cors({
			credentials: true,
		}),
		() => json({ foo: "bar" }),
	);

	it("should enable Access-Control-Allow-Credentials on Simple request", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should enable Access-Control-Allow-Credentials on Preflight request", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "DELETE")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect(204);
	});
});

describe("options.credentials unset", function () {
	const app = compose(cors(), () => json({ foo: "bar" }));

	it("should disable Access-Control-Allow-Credentials on Simple request", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, function (response) {
				const header = response.headers["access-control-allow-credentials"];
				expect(header).toBeUndefined();
			});
	});

	it("should disable Access-Control-Allow-Credentials on Preflight request", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "DELETE")
			.expect(204, function (response) {
				const header = response.headers["access-control-allow-credentials"];
				expect(header).toBeUndefined();
			});
	});
});

describe("options.credentials=function", function () {
	const app = compose(
		cors({
			credentials(ctx) {
				return ctx.url.pathname !== "/forbin";
			},
		}),
		() => json({ foo: "bar" }),
	);

	it("should enable Access-Control-Allow-Credentials on Simple request", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should enable Access-Control-Allow-Credentials on Preflight request", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "DELETE")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect(204);
	});

	it("should disable Access-Control-Allow-Credentials on Simple request", async () => {
		await request(app)
			.get("/forbin")
			.set("Origin", "https://hattipjs.org")
			.expect({ foo: "bar" })
			.expect(200, function (response) {
				const header = response.headers["access-control-allow-credentials"];
				expect(header).toBeUndefined();
			});
	});

	it("should disable Access-Control-Allow-Credentials on Preflight request", async () => {
		await request(app)
			.options("/forbin")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "DELETE")
			.expect(204, function (response) {
				const header = response.headers["access-control-allow-credentials"];
				expect(header).toBeUndefined();
			});
	});
});

describe("options.credentials=async function", function () {
	const app = compose(
		cors({
			async credentials() {
				return true;
			},
		}),
		() => json({ foo: "bar" }),
	);

	it("should enable Access-Control-Allow-Credentials on Simple request", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect({ foo: "bar" })
			.expect(200);
	});

	it("should enable Access-Control-Allow-Credentials on Preflight request", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "DELETE")
			.expect("Access-Control-Allow-Credentials", "true")
			.expect(204);
	});
});

describe("options.allowHeaders", function () {
	it("should work with allowHeaders is string", async () => {
		const app = compose(
			cors({
				allowHeaders: "X-PINGOTHER",
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Allow-Headers", "X-PINGOTHER")
			.expect(204);
	});

	it("should work with allowHeaders is array", async () => {
		const app = compose(
			cors({
				allowHeaders: ["X-PINGOTHER"],
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Allow-Headers", "X-PINGOTHER")
			.expect(204);
	});

	it("should set Access-Control-Allow-Headers to request access-control-request-headers header", async () => {
		const app = compose(cors(), () => json({ foo: "bar" }));

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.set("access-control-request-headers", "X-PINGOTHER")
			.expect("Access-Control-Allow-Headers", "X-PINGOTHER")
			.expect(204);
	});
});

describe("options.allowMethods", function () {
	it("should work with allowMethods is array", async () => {
		const app = compose(
			cors({
				allowMethods: ["GET", "POST"],
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect("Access-Control-Allow-Methods", "GET,POST")
			.expect(204);
	});

	it("should skip allowMethods", async () => {
		const app = compose(
			cors({
				allowMethods: null,
			}),
			() => json({ foo: "bar" }),
		);

		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect(204);
	});
});

describe("other middleware has been set `Vary` header to Accept-Encoding", function () {
	const app = compose(
		async (ctx) => {
			const response = await ctx.next();
			response.headers.append("Vary", "Accept-Encoding");
			return response;
		},
		cors(),
		() => json({ foo: "bar" }),
	);

	it("should append `Vary` header to Origin", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.expect("Vary", "Origin, Accept-Encoding")
			.expect({ foo: "bar" })
			.expect(200);
	});
});

describe("options.privateNetworkAccess=false", function () {
	const app = compose(
		cors({
			privateNetworkAccess: false,
		}),
		() => json({ foo: "bar" }),
	);

	it("should not set `Access-Control-Allow-Private-Network` on not OPTIONS", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect(200, (res) => {
				assert(!("Access-Control-Allow-Private-Network" in res.headers));
			});
	});

	it("should not set `Access-Control-Allow-Private-Network` if `Access-Control-Request-Private-Network` not exist on OPTIONS", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect(204, (res) => {
				assert(!("Access-Control-Allow-Private-Network" in res.headers));
			});
	});

	it("should not set `Access-Control-Allow-Private-Network` if `Access-Control-Request-Private-Network` exist on OPTIONS", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.set("Access-Control-Request-Private-Network", "true")
			.expect(204, (res) => {
				assert(!("Access-Control-Allow-Private-Network" in res.headers));
			});
	});
});

describe("options.privateNetworkAccess=true", function () {
	const app = compose(
		cors({
			privateNetworkAccess: true,
		}),
		() => json({ foo: "bar" }),
	);

	it("should not set `Access-Control-Allow-Private-Network` on not OPTIONS", async () => {
		await request(app)
			.get("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect(200, (res) => {
				assert(!("Access-Control-Allow-Private-Network" in res.headers));
			});
	});

	it("should not set `Access-Control-Allow-Private-Network` if `Access-Control-Request-Private-Network` not exist on OPTIONS", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.expect(204, (res) => {
				assert(!("Access-Control-Allow-Private-Network" in res.headers));
			});
	});

	it("should always set `Access-Control-Allow-Private-Network` if `Access-Control-Request-Private-Network` exist on OPTIONS", async () => {
		await request(app)
			.options("/")
			.set("Origin", "https://hattipjs.org")
			.set("Access-Control-Request-Method", "PUT")
			.set("Access-Control-Request-Private-Network", "true")
			.expect("Access-Control-Allow-Private-Network", "true")
			.expect(204);
	});
});

function request(handler: HattipHandler): RequestInterface {
	const fetch = createTestClient({ handler });

	const result = {
		_request: null as unknown as Request,
		_response: null as null | Promise<Response>,

		request(method: string, url: string) {
			this._request = new Request(new URL(url, "http://example.com"), {
				method,
			});
			return this;
		},

		expect(arg: any, cb?: ((res: SimpleResponse) => void) | string) {
			if (!this._response) {
				this._response = fetch(this._request);
			}

			if (typeof arg === "object") {
				expect(this._response!.then((r) => r.json())).resolves.toStrictEqual(
					arg,
				);
			} else if (typeof arg === "number") {
				return this._response!.then((r) => {
					expect(r.status).toBe(arg);

					if (typeof cb === "function") {
						cb({
							headers: Object.fromEntries(r.headers.entries()),
						});
					}
				});
			} else if (typeof arg === "string") {
				expect(this._response!.then((r) => r.headers.get(arg))).resolves.toBe(
					cb,
				);
			}

			return this;
		},

		set(key: string, value: string) {
			this._request!.headers.set(key, value);
			return this;
		},

		get(url: string) {
			return this.request("GET", url);
		},

		options(url: string) {
			return this.request("OPTIONS", url);
		},
	};

	return result as RequestInterface;
}

interface SimpleResponse {
	headers: Record<string, string>;
}

function assert(arg: any) {
	expect(arg).toBeTruthy();
}

interface RequestInterface {
	set(key: string, value: string): RequestInterface;
	get(url: string): RequestInterface;
	options(url: string): RequestInterface;
	expect(body: Record<string, string>): RequestInterface;
	expect(header: string, value: string): RequestInterface;
	expect(status: number, cb?: (res: SimpleResponse) => void): Promise<void>;
}
