import "./install-polyfills.js";
import {
	test as originalTest,
	expect,
	describe,
	beforeAll,
	afterAll,
} from "vitest";
import { ChildProcess, spawn } from "node:child_process";
import psTree from "ps-tree";
import { kill } from "node:process";
import { promisify } from "node:util";
import { testFetch } from "./entry-test";

let host: string;
let cases: Array<{
	name: string;
	command?: string;
	envOverride?: Record<string, string>;
	fetch?: typeof fetch;
	requiresForwardedIp?: boolean;
	skipStreamingTest?: boolean;
	skipCryptoTest?: boolean;
	skipStaticFileTest?: boolean;
	tryStreamingWithoutCompression?: boolean;
}>;

const nodeVersions = process.versions.node.split(".");
const nodeVersionMajor = +nodeVersions[0];
const nodeVersionMinor = +nodeVersions[1];

const fetchAvailableByDefault = nodeVersionMajor >= 18;

if (process.env.CI === "true") {
	const fetchAvailable =
		nodeVersionMajor >= 18 ||
		(nodeVersionMajor >= 17 && nodeVersionMinor >= 5) ||
		(nodeVersionMajor >= 16 && nodeVersionMinor >= 15);

	if (!fetchAvailable) {
		console.warn("Node version < 17.5 or 16.15, will skip native fetch tests");
	}

	const wranglerAvailable =
		nodeVersionMajor >= 17 ||
		(nodeVersionMajor >= 16 && nodeVersionMinor >= 13);
	if (!wranglerAvailable) {
		console.warn(
			"Node version < 16.13, will skip wrangler (Cloudflare Workers) tests",
		);
	}

	const bunAvailable = process.platform !== "win32";

	const uwsAvailable = false; // nodeVersionMajor >= 18 && process.platform === "linux";
	// if (!uwsAvailable) {
	// 	console.warn(
	// 		"Node version < 18 or not on Linux, will skip uWebSockets.js tests",
	// 	);
	// }

	const noFetchFlag = fetchAvailable ? "--no-experimental-fetch" : "";

	cases = [
		{
			name: "Test adapter",
			fetch: testFetch,
			requiresForwardedIp: true,
			skipStaticFileTest: true,
		},
		fetchAvailable && {
			name: "Node with native fetch",
			command: "node --experimental-fetch entry-node-native-fetch.js",
		},
		{
			name: "Node with node-fetch",
			command: `node ${noFetchFlag} entry-node.js`,
			skipCryptoTest: nodeVersionMajor < 16,
		},
		fetchAvailable && {
			name: "Node with @whatwg-node/fetch",
			command: `node ${noFetchFlag} entry-node-whatwg.js`,
			skipCryptoTest: nodeVersionMajor < 16,
		},
		{
			name: "Deno",
			command: "pnpm build:deno && pnpm start:deno",
			requiresForwardedIp: true,
			skipStreamingTest: true,
			tryStreamingWithoutCompression: true,
		},
		{
			name: "Deno with std/http",
			command: "pnpm build:deno-std && pnpm start:deno",
		},
		{
			name: "Deno with node:http",
			command: "pnpm build:deno-node && pnpm start:deno",
			requiresForwardedIp: true,
			skipStreamingTest: true,
			tryStreamingWithoutCompression: true,
			envOverride: {
				TRUST_PROXY: "1",
			},
		},
		bunAvailable && {
			name: "Bun",
			command: "bun run entry-bun.js",
			skipStreamingTest: true,
		},
		bunAvailable && {
			name: "Bun with node:http",
			command: "bun run entry-node-native-fetch.js",
			skipStreamingTest: true,
			skipCryptoTest: true, // https://github.com/oven-sh/bun/issues/4070
		},
		wranglerAvailable && {
			name: "Cloudflare Workers",
			command: "pnpm build:cfw && pnpm start:cfw",
		},
		{
			name: "Netlify Functions with netlify serve",
			command: "pnpm build:netlify-functions && pnpm start:netlify",
			skipStreamingTest: true,
			skipCryptoTest: nodeVersionMajor < 16,
		},
		false && {
			name: "Netlify Edge Functions with netlify serve",
			command: "pnpm build:netlify-edge && pnpm start:netlify",
			skipStreamingTest: true,
		},
		uwsAvailable && {
			name: "uWebSockets.js",
			command: `node ${noFetchFlag} entry-uws.js`,
		},
		{
			name: "Lagon",
			command: "lagon dev entry-lagon.js -p public --port 3000",
		},
		{
			name: "Google Cloud Functions",
			command: "functions-framework --port=3000",
			requiresForwardedIp: true,
		},
	].filter(Boolean) as typeof cases;
	host = "http://127.0.0.1:3000";
} else {
	cases = [
		{
			name: "Existing server",
		},
	];
	host = process.env.TEST_HOST || "http://127.0.0.1:3000";
}

const test = originalTest as typeof originalTest & {
	failsIf(condition: any): typeof originalTest.fails | typeof originalTest;
};

test.failsIf = function failsIf(condition) {
	if (condition) {
		function fails(name, fn, options) {
			return originalTest.fails(`[EXPECTED FAIL] ${name}`, fn, options);
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
		command,
		envOverride,
		fetch = globalThis.fetch,
		skipStreamingTest,
		requiresForwardedIp,
		skipCryptoTest,
		skipStaticFileTest,
		tryStreamingWithoutCompression,
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
			console.log("Platform:", name, text);
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

			let ip;

			if (["127.0.0.1", "localhost"].includes(new URL(host).hostname)) {
				ip = "127.0.0.1";
			} else {
				ip = await fetch("http://api.ipify.org").then((r) => r.text());
			}

			let hostName = host;
			if (name === "Lagon") {
				// Lagon CLI reports the wrong protocol
				hostName = hostName.replace(/^http/, "https");
			}

			const EXPECTED = `<h1>Hello from Hattip!</h1><p>URL: <span>${
				hostName + "/"
			}</span></p><p>Your IP address is: <span>${ip}</span></p>`;

			expect(text).toContain(EXPECTED);
			expect(response.headers.get("content-type")).toEqual(
				"text/html; charset=utf-8",
			);
		});

		test.failsIf(skipStaticFileTest)("serves static files", async () => {
			const response = await fetch(host + "/static.txt");
			const text = await response.text();

			expect(text).toContain("This is a static file!");
		});

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

		test.failsIf(
			tryStreamingWithoutCompression
				? fetchAvailableByDefault
				: skipStreamingTest,
		)("doesn't fully buffer binary stream", async () => {
			const response = await fetch(host + "/bin-stream?delay=1");

			let chunks = 0;
			for await (const _chunk of response.body as AsyncIterable<Uint8Array>) {
				chunks++;
			}

			expect(chunks).toBeGreaterThan(3);
		});

		test.runIf(fetchAvailableByDefault && tryStreamingWithoutCompression)(
			"doesn't fully buffer binary stream with no compression",
			async () => {
				const response = await fetch(host + "/bin-stream?delay=1", {
					headers: { "Accept-Encoding": "" },
				});

				let chunks = 0;
				for await (const _chunk of response.body as AsyncIterable<Uint8Array>) {
					chunks++;
				}

				expect(chunks).toBeGreaterThan(3);
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
			expect(response.status).toEqual(403);
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

		test.skip("GraphQL", async () => {
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
