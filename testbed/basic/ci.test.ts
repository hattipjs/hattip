import "./install-polyfills.js";
import {
	test as originalTest,
	expect,
	describe,
	beforeAll,
	afterAll,
	TestFunction,
} from "vitest";
import { ChildProcess, spawn } from "node:child_process";
import psTree from "ps-tree";
import { kill } from "node:process";
import { promisify } from "node:util";
import { testFetch } from "./entry-test";

let host: string;
let cases: Array<{
	name: string;
	platform: string;
	command?: string;
	envOverride?: Record<string, string>;
	fetch?: typeof fetch;
	requiresForwardedIp?: boolean;
	skipStreamingTest?: boolean;
	skipCryptoTest?: boolean;
	skipStaticFileTest?: boolean;
	skipAdvancedStaticFileTest?: boolean;
	skipMultipartTest?: boolean;
	skipContentLengthTest?: boolean;
	skipDefaultStatusTextTest?: boolean;
	skipCustomStatusTextTest?: boolean;
	skipRequestCancelationTest?: boolean;
	tryStreamingWithoutCompression?: boolean;
	streamingMinimumChunkCount?: number;
}>;

const nodeVersions = process.versions.node.split(".");
const nodeVersionMajor = +nodeVersions[0];
// const nodeVersionMinor = +nodeVersions[1];

const bunAvailable = process.platform !== "win32";

if (process.env.CI === "true") {
	const noFetchFlag = "--no-experimental-fetch";

	const unfiltered: Array<boolean | (typeof cases)[0]> = [
		{
			name: "Test adapter",
			platform: "test",
			fetch: testFetch,
			requiresForwardedIp: true,
			skipStaticFileTest: true,
			skipContentLengthTest: true,
			skipDefaultStatusTextTest: true,
		},
		{
			name: "Node with native fetch",
			platform: "node",
			command: "node --experimental-fetch entry-node-native-fetch.js",
		},
		{
			name: "Node with node-fetch",
			platform: "node",
			command: `node ${noFetchFlag} entry-node.js`,
			skipCryptoTest: nodeVersionMajor < 16,
			skipMultipartTest: true, // node-fetch doesn't support streaming
			skipRequestCancelationTest: true, // node-fetch doesn't support request cancelation
		},
		{
			name: "Node with @whatwg-node/fetch",
			platform: "node",
			command: `node ${noFetchFlag} entry-node-whatwg.js`,
			skipCryptoTest: nodeVersionMajor < 16,
			skipRequestCancelationTest: true, // @whatwgnode/fetch doesn't support request cancelation
		},
		{
			name: "Node with fast-fetch patch",
			platform: "node",
			command: `node entry-node-fast-fetch.js`,
			skipCryptoTest: nodeVersionMajor < 16,
		},
		{
			name: "Deno",
			platform: "deno",
			command: "pnpm build:deno && pnpm start:deno",
			requiresForwardedIp: true,
			skipCustomStatusTextTest: true,
		},
		{
			name: "Deno with std/http",
			platform: "deno",
			command: "pnpm build:deno-std && pnpm start:deno",
			skipCustomStatusTextTest: true,
		},
		{
			name: "Deno with node:http",
			platform: "node",
			command: "pnpm build:deno-node && pnpm start:deno",
			requiresForwardedIp: true,
			skipCustomStatusTextTest: true,
			skipRequestCancelationTest: true, // Deno's node:http doesn't support request cancelation
			envOverride: {
				TRUST_PROXY: "1",
			},
		},
		bunAvailable && {
			name: "Bun",
			platform: "bun",
			command: "bun run entry-bun.js",
			skipCustomStatusTextTest: true,
		},
		bunAvailable && {
			name: "Bun with node:http",
			platform: "node",
			command: "bun run entry-node-native-fetch.js",
			skipCustomStatusTextTest: true,
		},
		{
			name: "Cloudflare Workers",
			platform: "cloudflare-workers",
			command: "pnpm build:cfw && pnpm start:cfw",
			streamingMinimumChunkCount: 1,
			// CF does support request cancelation but
			// wrangler doesn't seem to.
			//
			// Even on real CF, request.signal's abort event
			// isn't fired, the worker is killed instead.
			// But the response stream is canceled
			// correctly.
			skipRequestCancelationTest: true,
		},
		{
			name: "Netlify Functions with netlify dev",
			platform: "netlify-functions",
			command: "pnpm build:netlify-functions && pnpm start:netlify",
			skipStreamingTest: true,
			skipCryptoTest: nodeVersionMajor < 16,
			skipContentLengthTest: true,
			skipCustomStatusTextTest: true,
			skipRequestCancelationTest: true, // netlify dev doesn't support request cancelation
		},
		{
			name: "Netlify Edge Functions with netlify dev",
			platform: "netlify-edge",
			command: "pnpm build:netlify-edge && pnpm start:netlify",
			skipContentLengthTest: true,
			skipCustomStatusTextTest: true,
			skipRequestCancelationTest: true, // netlify dev doesn't support request cancelation
		},
		{
			name: "uWebSockets.js",
			platform: "uwebsockets",
			command: `node entry-uws.js`,
		},
		false && {
			// TODO: Lagon is no more and it doesn't seem to work on Node 21
			name: "Lagon",
			command: "lagon dev entry-lagon.js -p public --port 3000",
			skipAdvancedStaticFileTest: true,
			skipMultipartTest: true, // Seems like a btoa bug in Lagon
		},
		{
			name: "Google Cloud Functions",
			platform: "node",
			command: "functions-framework --port=3000",
			requiresForwardedIp: true,
		},
	];

	cases = unfiltered.filter(Boolean) as typeof cases;
	host = "http://127.0.0.1:3000";
} else {
	cases = [
		{
			name: "Existing server",
			platform: process.env.TEST_PLATFORM || "unknown",
		},
	];
	host = process.env.TEST_HOST || "http://127.0.0.1:3000";
}

const test = originalTest as typeof originalTest & {
	failsIf(condition: any): typeof originalTest.fails | typeof originalTest;
};

test.failsIf = function failsIf(condition) {
	if (condition) {
		function fails(name: string, options: any, fn: TestFunction) {
			return originalTest.fails(`[EXPECTED FAIL] ${name}`, options, fn);
		}

		Object.assign(fails, originalTest);

		return fails as typeof originalTest.fails;
	}

	return originalTest;
};

let cp: ChildProcess | undefined;

describe.each(cases)(
	"$name",
	({
		name,
		platform,
		command,
		envOverride,
		fetch = globalThis.fetch,
		requiresForwardedIp = false,
		tryStreamingWithoutCompression = false,
		skipStreamingTest = false,
		skipCryptoTest = false,
		skipStaticFileTest = false,
		skipAdvancedStaticFileTest = false,
		skipMultipartTest = false,
		streamingMinimumChunkCount = 3,
		skipContentLengthTest = false,
		skipDefaultStatusTextTest = false,
		skipCustomStatusTextTest = false,
		skipRequestCancelationTest = false,
	}) => {
		beforeAll(async () => {
			const original = fetch;
			fetch = async (url, options) => {
				let lastError;
				for (let i = 0; i < 5; i++) {
					try {
						return await original(url, options);
					} catch (error) {
						lastError = error;
					}
				}

				throw lastError;
			};
		});

		if (command) {
			beforeAll(async () => {
				console.log("Starting", name);
				if (skipStreamingTest) {
					console.warn("Skipping streaming test for", name);
				}

				cp = spawn(command, {
					shell: true,
					stdio: "inherit",
					env: {
						...process.env,
						...envOverride,
					},
				});

				let timeout: ReturnType<typeof setTimeout> | undefined;
				let caught: any;

				// Wait until server is ready
				await new Promise((resolve, reject) => {
					cp!.on("error", (error) => {
						cp = undefined;
						reject(error);
					});

					cp!.on("exit", (code) => {
						if (code !== 0) {
							cp = undefined;
							reject(new Error(`Process exited with code ${code}`));
						}
					});

					let done = false;

					const interval = setInterval(() => {
						fetch(host)
							.then(async (r) => {
								if (r.status === 200) {
									done = true;
									clearInterval(interval);
									resolve(null);
								}
							})
							.catch((error) => {
								caught = error;
							});
					}, 250);

					timeout = setTimeout(() => {
						console.log("Timeout", name);
						if (caught) {
							console.error(caught);
						}
						if (!done) {
							clearInterval(interval);
							killTree(cp, name).finally(() => {
								cp = undefined;
								reject(new Error("Timeout"));
							});
						}
					}, 60_000);
				});

				if (timeout) {
					clearTimeout(timeout);
				}
			}, 60_000);

			afterAll(async () => {
				await killTree(cp, name).finally(() => {
					cp = undefined;
				});
			});
		}

		test("platform", async () => {
			const response = await fetch(host + "/platform");
			const text = await response.text();
			expect(response.status).toBe(200);
			expect(text).toBe(`Platform: ${platform}`);
		});

		test("renders HTML", async () => {
			const response = await fetch(
				host,
				requiresForwardedIp
					? {
							headers: { "x-forwarded-for": "127.0.0.1" },
						}
					: undefined,
			);
			const text = await response.text();

			let ip: string;
			let ip6: string;

			if (["127.0.0.1", "localhost"].includes(new URL(host).hostname)) {
				ip = "127.0.0.1";
				ip6 = "::1";
			} else {
				[ip, ip6] = await Promise.all([
					fetch("http://api.ipify.org").then((r) => r.text()),
					fetch("http://api64.ipify.org").then((r) => r.text()),
				]);
			}

			const ip6_2 = "::ffff:" + ip;

			let hostName = host;
			if (name === "Lagon") {
				// Lagon CLI reports the wrong protocol
				hostName = hostName.replace(/^http/, "https");
			}

			const EXPECTED = `<h1>Hello from Hattip!</h1><p>URL: <span>${
				hostName + "/"
			}</span></p><p>Your IP address is: <span>${ip}</span></p>`;

			const EXPECTED_6 = `<h1>Hello from Hattip!</h1><p>URL: <span>${
				hostName + "/"
			}</span></p><p>Your IP address is: <span>${ip6}</span></p>`;

			const EXPECTED_6_2 = `<h1>Hello from Hattip!</h1><p>URL: <span>${
				hostName + "/"
			}</span></p><p>Your IP address is: <span>${ip6_2}</span></p>`;

			expect([EXPECTED, EXPECTED_6, EXPECTED_6_2]).toContain(text);

			expect(response.headers.get("content-type")).toEqual(
				"text/html; charset=utf-8",
			);
		});

		test.failsIf(skipContentLengthTest)(
			"renders text with Content-Length",
			async () => {
				const response = await fetch(host + "/text", {
					// Ensure uncompressed response
					headers: { "Accept-Encoding": "" },
				});
				const text = await response.text();
				expect(text).toEqual("Hello world!");
				expect(response.headers.get("content-length")).toEqual("12");
			},
		);

		test.failsIf(skipStaticFileTest)("serves static files", async () => {
			const response = await fetch(host + "/static.txt");
			const text = await response.text();

			expect(text).toContain("This is a static file!");
		});

		test.failsIf(skipStaticFileTest || skipAdvancedStaticFileTest)(
			"serves advanced static files",
			async () => {
				const response = await fetch(host + "/🙂🙂🙂");

				expect(response.status).toBe(200);
				expect(response.headers.get("content-type")).toContain("text/html");

				const text = await response.text();
				expect(text).toContain("🙂🙂🙂");
			},
		);

		test("renders binary", async () => {
			const response = await fetch(host + "/binary");
			const text = await response.text();
			const EXPECTED = "This is rendered as binary with non-ASCII chars 😊";
			expect(text).toEqual(EXPECTED);
		});

		test("renders binary stream", async () => {
			const response = await fetch(host + "/bin-stream");

			const text = await response.text();
			expect(text).toEqual(
				"This is rendered as binary stream with non-ASCII chars 😊",
			);
		});

		test.failsIf(tryStreamingWithoutCompression || skipStreamingTest)(
			"doesn't fully buffer binary stream",
			async () => {
				const response = await fetch(host + "/bin-stream?delay=10");

				let chunks = 0;
				for await (const _chunk of response.body as any as AsyncIterable<Uint8Array>) {
					chunks++;
				}

				expect(chunks).toBeGreaterThan(streamingMinimumChunkCount);
			},
		);

		test.runIf(tryStreamingWithoutCompression)(
			"doesn't fully buffer binary stream with no compression",
			async () => {
				const response = await fetch(host + "/bin-stream?delay=10", {
					headers: { "Accept-Encoding": "" },
				});

				let chunks = 0;
				for await (const _chunk of response.body as any as AsyncIterable<Uint8Array>) {
					chunks++;
				}

				expect(chunks).toBeGreaterThan(streamingMinimumChunkCount);
			},
		);

		test("echoes text", async () => {
			const response = await fetch(host + "/echo-text", {
				method: "POST",
				body: "Hello world! 😊",
			});
			const text = await response.text();
			expect(text).toEqual("Hello world! 😊");
		});

		test("echoes binary", async () => {
			const response = await fetch(host + "/echo-bin", {
				method: "POST",
				body: "ABC",
			});
			const text = await response.text();
			expect(text).toEqual("65, 66, 67");
		});

		test("parses cookies", async () => {
			const response = await fetch(host + "/cookie", {
				headers: {
					Cookie: "foo=bar; baz=qux",
				},
			});

			const json = await response.json();

			expect(json).toEqual({
				foo: "bar",
				baz: "qux",
			});
		});

		test("sends multiple cookies", async () => {
			const response = await fetch(host + "/set-cookie");

			expect(response.headers.getSetCookie!()).toMatchObject([
				"name1=value1",
				"name2=value2",
			]);
		});

		test("sets status", async () => {
			const response = await fetch(host + "/status");
			expect(response.status).toEqual(400);

			if (!skipDefaultStatusTextTest) {
				expect(response.statusText).toEqual("Bad Request");
			}

			if (!skipCustomStatusTextTest) {
				const response = await fetch(host + "/status?custom");
				expect(response.statusText).toEqual("Custom Status Text");
			}
		});

		test("sends 404", async () => {
			const response = await fetch(host + "/not-found");
			expect(response.status).toEqual(404);
		});

		test("searchParams work", async () => {
			const response = await fetch(host + "/query?foo=bar");
			const text = await response.text();
			expect(text).toEqual('"bar"');
		});

		test("GraphQL", async () => {
			function g(query: string) {
				return fetch(host + "/graphql", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Test": "test",
					},
					body: JSON.stringify({ query }),
				});
			}

			const r1 = await g("{ hello }").then((r) => r.json());
			expect(r1).toStrictEqual({ data: { hello: "Hello world!" } });

			const r2 = await g("{ context }").then((r) => r.json());
			expect(r2).toStrictEqual({ data: { context: "test" } });

			const r3 = await g("{ sum(a: 1, b: 2) }").then((r) => r.json());
			expect(r3).toStrictEqual({ data: { sum: 3 } });
		});

		test.failsIf(skipMultipartTest)("multipart form data works", async () => {
			const fd = new FormData();
			const data = Uint8Array.from(
				new Array(300).fill(0).map((_, i) => i & 0xff),
			);
			fd.append("file", new File([data], "hello.txt", { type: "text/plain" }));
			fd.append("text", "Hello world! 😊");

			const r = await fetch(host + "/form", {
				method: "POST",
				body: fd,
			}).then((r) => r.json());

			expect(r).toEqual({
				text: "Hello world! 😊",
				file: {
					name: "file",
					filename: "hello.txt",
					unsanitizedFilename: "hello.txt",
					contentType: "text/plain",
					body: Buffer.from(data).toString("base64"),
				},
			});
		});

		test.failsIf(skipCryptoTest)("session", async () => {
			const response = await fetch(host + "/session");
			const text = await response.text();
			expect(text).toEqual("You have visited this page 1 time(s).");

			const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
			const response2 = await fetch(host + "/session", {
				headers: { cookie },
			});
			const text2 = await response2.text();
			expect(text2).toEqual("You have visited this page 2 time(s).");
		});

		test.failsIf(skipRequestCancelationTest)(
			"cancels response stream when client disconnects",
			async () => {
				const controller = new AbortController();
				const { signal } = controller;

				const response = await fetch(host + "/abort", { signal });
				const stream = response.body!;

				for await (const chunk of stream) {
					expect(chunk.slice(0, 4)).toStrictEqual(new Uint8Array([1, 2, 3, 4]));
					break;
				}

				controller.abort();

				await new Promise((resolve) => {
					setTimeout(resolve, 1000);
				});

				const result = await fetch(host + "/abort-check").then((r) => r.json());
				expect(result).toStrictEqual({
					aborted: true,
					intervalCleared: true,
				});
			},
		);
	},
);

async function killTree(cp: ChildProcess | undefined, name: string) {
	if (!cp || cp.exitCode || !cp.pid) {
		return;
	}

	try {
		const tree = await promisify(psTree)(cp.pid);
		const pids = [cp.pid, ...tree.map((p) => +p.PID)];

		console.log("Stopping", name, pids.join(", "));
		for (const pid of pids) {
			try {
				kill(+pid, "SIGINT");
			} catch {
				// Ignore error
			}
		}

		const timeout = setTimeout(() => {
			console.warn("Trying to force kill", name);
			for (const pid of pids) {
				try {
					kill(+pid, "SIGKILL");
				} catch {
					// Ignore error
				}
			}
		}, 5_000);

		await new Promise<void>((resolve) => {
			cp!.on("exit", () => {
				clearTimeout(timeout);
				resolve();
			});
		});

		console.log("Stopped", name);
	} catch (error) {
		console.error("Error stopping", name);
		console.error(error);
	}
}
