/* eslint-disable no-console */
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { writeFileSync } from "node:fs";
import { launchAndTest } from "kill-em-all";
import { sendRawRequest, type ParsedResponse } from "./raw-http.ts";

const HOST = "http://localhost:3000";

type RuntimeName = "Node" | "Bun" | "Deno" | "Cloudflare";

interface Runtime {
	name: RuntimeName;
	runCommand: string;
	only?: boolean;
}

interface Entry {
	name: string;
	entry: string;
	supportedRuntimes: RuntimeName[];
	only?: boolean;
}

interface Test {
	name: string;
	method?: string;
	url?: string;
	hostHeader?: string;
	verify: (response: ParsedResponse) => string;
	expectedStatus?: (status: number) => string;
}

interface TestEntry {
	name: string;
	runtime: RuntimeName;
	command: string;
	results: Map<string, string>;
}

interface Failure {
	name: string;
	runtime: RuntimeName;
	reason: string;
}

const runtimes: Runtime[] = [
	{ name: "Node", runCommand: "node" },
	{ name: "Bun", runCommand: "bun run" },
	{
		name: "Deno",
		runCommand: "deno run --allow-net --allow-env",
	},
	{
		name: "Cloudflare",
		runCommand: "wrangler dev --log-level=none --port 3000",
	},
];

const entries: Entry[] = [
	{
		name: "Node",
		entry: "node.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Bun",
		entry: "bun.ts",
		supportedRuntimes: ["Bun"],
	},
	{
		name: "Deno",
		entry: "deno.ts",
		supportedRuntimes: ["Deno"],
	},
	{
		name: "uWebSockets",
		entry: "uws.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "wrangler",
		entry: "cloudflare.ts",
		supportedRuntimes: ["Cloudflare"],
	},
	{
		name: "Hattip",
		entry: "hattip-node.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "h3",
		entry: "h3.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Hono",
		entry: "hono-node.ts",
		supportedRuntimes: ["Node"],
	},
];

const tests: Test[] = [
	{
		name: "Simple GET request",
		verify(response) {
			return response.body.method === "GET" &&
				(response.body.rawUrl === "/" ||
					response.body.url === "http://localhost:3000/")
				? "✓"
				: `! ${response.body.method} ${response.body.url ?? response.body.rawUrl}`;
		},
	},
	{
		name: "Lowercase method",
		method: "get",
		verify(response) {
			return response.body.method === "get"
				? "✓"
				: `! (${response.body.method})`;
		},
		expectedStatus: (status) => `- ${status || "No response"}`,
	},
	{
		name: "`CONNECT` method",
		method: "CONNECT",
		url: "http://localhost:3000",
		verify(response) {
			return response.body.method === "CONNECT"
				? "✓"
				: `! (${response.body.method})`;
		},
		expectedStatus: (status) => `- ${status || "No response"}`,
	},
	{
		name: "`TRACE` method",
		method: "TRACE",
		verify(response) {
			return response.body.method === "TRACE"
				? "✓"
				: `! (${response.body.method})`;
		},
		expectedStatus: (status) => `- ${status || "No response"}`,
	},
	{
		name: "`ACL` method",
		method: "ACL",
		verify(response) {
			return response.body.method === "ACL"
				? "✓"
				: `! (${response.body.method})`;
		},
		expectedStatus: (status) => `- ${status || "No response"}`,
	},
	{
		name: "`FOO` method (custom)",
		method: "FOO",
		verify(response) {
			return response.body.method === "FOO"
				? "✓"
				: `! (${response.body.method})`;
		},
		expectedStatus: (status) =>
			status === 400 ? `- ${status}` : `! ${status || "No response"}`,
	},
	{
		name: "Empty method",
		method: "",
		verify(response) {
			return `! "${response.body.method}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "Request target not starting with slash",
		url: "no-leading-slash",
		verify(response) {
			return `! ${response.body.url ?? response.body.rawUrl}`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "`OPTIONS *`",
		method: "OPTIONS",
		url: "*",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://localhost:3000/*"
				? "- `/*`"
				: response.body.url === "http://localhost:3000*"
					? "! `*`"
					: `! (${response.body.url.slice("http://localhost:3000".length)})`;
		},
		expectedStatus: (status) => `- ${status || "No response"}`,
	},
	{
		name: "`GET *`",
		method: "GET",
		url: "*",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://localhost:3000/*"
				? "!"
				: response.body.url === "http://localhost:3000*"
					? "! `*`"
					: `! (${response.body.url.slice("http://localhost:3000".length)})`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "`/../outside` (path traversal)",
		url: "/../outside",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			const pathname = response.body.url.slice("http://localhost:3000".length);
			return pathname === "/outside"
				? `✓`
				: pathname === "/../outside"
					? "!"
					: `! "${pathname}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `- ${status}` : `! ${status || "No response"}`,
	},
	{
		name: "`/a/b/../c` (path normalization)",
		url: "/a/b/../c",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			const pathname = response.body.url.slice("http://localhost:3000".length);
			return pathname === "/a/c"
				? "✓"
				: pathname === "/a/b/../c"
					? "!"
					: `! "${pathname}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `- ${status}` : `! ${status || "No response"}`,
	},
	{
		name: "Hash in URL",
		url: "/path#hash",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			const pathname = response.body.url.slice("http://localhost:3000".length);
			return pathname === "/path"
				? "-"
				: pathname === "/path#hash"
					? "!"
					: `! "${pathname}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "Illegal characters in URL",
		url: "/şeşbeş",
		verify(response) {
			if (response.body.rawUrl) {
				return "!";
			}

			const pathname = response.body.url.slice("http://localhost:3000".length);
			return pathname === "/şeşbeş"
				? "!"
				: pathname === "/%C5%9Fe%C5%9Fbe%C5%9F"
					? "✓ (%)"
					: `! "${pathname}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "Full URL in request line",
		url: "http://example.com/full-url",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://example.com/full-url"
				? "✓"
				: response.body.url ===
					  "http://localhost:3000http://example.com/full-url"
					? "!"
					: `! "${response.body.url}"`;
		},
	},
	{
		name: "`file:///` URL in request line",
		url: "file:///example.com/x",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "file:///example.com/x"
				? "-"
				: response.body.url === "http://localhost:3000file:///example.com/x"
					? "!"
					: `! "${response.body.url}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "`unknown://` URL scheme in request line",
		url: "unknown://example.com/",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "unknown://example.com/"
				? "-"
				: response.body.url === "http://localhost:3000unknown://example.com/"
					? "!"
					: `! "${response.body.url}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓` : `! ${status || "No response"}`,
	},
	{
		name: "Uppercase host request line",
		url: "http://UPPER.COM/x",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://upper.com/x"
				? "✓"
				: response.body.url === "http://UPPER.COM/x"
					? "-"
					: response.body.url === "http://localhost:3000http://UPPER.COM/x"
						? "!"
						: `! "${response.body.url}"`;
		},
	},
	{
		name: "Uppercase Host header",
		hostHeader: "LOCALHOST:3000",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://localhost:3000/"
				? "✓"
				: response.body.url === "http://LOCALHOST:3000/"
					? "-"
					: `! "${response.body.url}"`;
		},
	},
	{
		name: "Leading zero IP in Host header",
		hostHeader: "027.0.0.1:3000",
		verify(response) {
			return response.body.rawUrl ?? response.body.url;
		},
	},
	{
		name: "Scheme in Host header",
		hostHeader: "http://localhost:3000",
		verify(response) {
			if (response.body.rawUrl) {
				return "N/A";
			}

			return response.body.url === "http://http://localhost:3000/" ||
				response.body.url === "http://http//localhost:3000/"
				? "!"
				: response.body.url === "http://localhost:3000/"
					? "✓"
					: `! "${response.body.url}"`;
		},
		expectedStatus: (status) =>
			status === 400 ? `✓ ${status}` : `! ${status || "No response"}`,
	},
];

const root = import.meta.dirname + "/../http";

const hasOnlyRuntime = runtimes.some((r) => r.only);
const hasOnlyEntry = entries.some((e) => e.only);

const testEntries: TestEntry[] = [];
const failures: Failure[] = [];

for (const runtime of runtimes) {
	if (hasOnlyRuntime && !runtime.only) continue;

	for (const entry of entries) {
		if (hasOnlyEntry && !entry.only) continue;

		if (entry.supportedRuntimes.includes(runtime.name)) {
			const filename = path.resolve(root + "/" + entry.entry);
			testEntries.push({
				name: entry.name,
				runtime: runtime.name,
				command: `${runtime.runCommand} ${filename}`,
				results: new Map(),
			});
		}
	}
}

console.log(`${testEntries.length} entries will be tested.\n`);

for (const entry of testEntries) {
	console.log(`Testing ${entry.name} on ${entry.runtime}`);

	const cp = spawn(entry.command, {
		shell: true,
		stdio: "inherit",
		env: {
			...process.env,
			NODE_ENV: "production",
		},
	});

	let kill = await launchAndTest(cp, HOST, 5000).catch((error) => {
		console.log("Launch failed");
		console.log(error);
		failures.push({
			name: entry.name,
			runtime: entry.runtime,
			reason: `Launch failed: ${error instanceof Error ? error.message : String(error)}`,
		});
	});

	if (!kill) continue;

	try {
		for (const test of tests) {
			const method = test.method ?? "GET";
			const url = test.url ?? "/";
			const hostHeader = test.hostHeader ?? "localhost:3000";

			try {
				if (test.method === "OPTIONS") {
					console.log("Here we are");
				}
				const response = await sendRawRequest(
					"127.0.0.1",
					3000,
					method,
					url,
					hostHeader,
				);

				if (response.status !== 200) {
					const expected = test.expectedStatus
						? test.expectedStatus(response.status)
						: `! ${response.status || "No response"}`;
					entry.results.set(test.name, expected);
					console.log(`  ${test.name}: ${expected}`);
					console.log(`    Raw response:`, response.body);
					continue;
				}

				if (
					typeof response.body === "string" &&
					response.body.includes("HTTP/1.1")
				) {
					entry.results.set(test.name, "! BROKEN");
					console.log(`  ${test.name}: ! BROKEN`);
					console.log(`    Raw response:`, response.body);
					continue;
				}

				if (typeof response.body !== "object" || response.body === null) {
					entry.results.set(test.name, "! FAILED");
					console.log(`  ${test.name}: FAILED`);
					console.log(`    Status: ${response.status}`);
					console.log(`    Headers: ${JSON.stringify([...response.headers])}`);
					console.log(`    Body: ${JSON.stringify(response.body)}`);
					continue;
				}

				const result = test.verify(response);
				entry.results.set(test.name, result);
				console.log(`  ${test.name}: ${result}`);
			} catch (error) {
				// sendRawRequest failed — check if the server is still alive
				const alive = await sendRawRequest(
					"127.0.0.1",
					3000,
					"GET",
					"/",
					"localhost:3000",
				).then(
					() => true,
					() => false,
				);

				if (alive) {
					entry.results.set(test.name, "! ERROR");
					console.log(`  ${test.name}: ! ERROR`);
					console.log(
						`    Error: ${error instanceof Error ? error.message : String(error)}`,
					);
				} else {
					entry.results.set(test.name, "! CRASHED");
					console.log(`  ${test.name}: ! CRASHED`);
					console.log(
						`    Error: ${error instanceof Error ? error.message : String(error)}`,
					);

					// Relaunch the server
					await kill();
					const newCp = spawn(entry.command, {
						shell: true,
						stdio: "inherit",
						env: {
							...process.env,
							NODE_ENV: "production",
						},
					});
					const newKill = await launchAndTest(newCp, HOST, 5000).catch(
						(err) => {
							console.log(`    Relaunch failed: ${err}`);
							return undefined;
						},
					);
					if (!newKill) break;
					kill = newKill;
				}
			}
		}
		console.log();
	} finally {
		await kill();
	}
}

// Generate report
function formatTable(completedEntries: TestEntry[]) {
	const serverLabels = completedEntries.map((e) => e.name);
	const columns = ["Test", ...serverLabels];

	const rows = tests.map((test) => [
		test.name,
		...completedEntries.map((e) => e.results.get(test.name) ?? "-"),
	]);

	const widths = columns.map((col, i) =>
		Math.max(col.length, ...rows.map((row) => row[i]!.length)),
	);

	const pad = (s: string, w: number) => s.padEnd(w);

	let table = `| ${columns.map((c, i) => pad(c, widths[i]!)).join(" | ")} |\n`;
	table += `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|\n`;

	for (const row of rows) {
		table += `| ${row.map((c, i) => pad(c, widths[i]!)).join(" | ")} |\n`;
	}

	return table;
}

const now = new Date();
const dateStr = now.toLocaleDateString("en-US", {
	year: "numeric",
	month: "long",
	day: "numeric",
});
const timeStr = now.toLocaleTimeString("en-US", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

let output = "# HTTP behavior test results\n\n";
output += `*${dateStr} at ${timeStr}*\n\n`;
output +=
	"Tests how different runtimes handle various HTTP edge cases " +
	"by sending raw HTTP requests and inspecting the parsed response.\n\n";

const versionLines = [
	`- **OS:** ${os.type()} ${os.release()} (${os.arch()})`,
	`- **CPU:** ${os.cpus()[0]!.model} (${os.cpus().length} cores)`,
];

output += versionLines.join("\n") + "\n\n";

output += "## Results\n\n";
output += formatTable(testEntries.filter((e: TestEntry) => e.results.size > 0));

if (failures.length > 0) {
	output += "\n## Failures\n\n";
	output += "| Server | Runtime | Reason |\n";
	output += "|--------|---------|--------|\n";
	for (const f of failures) {
		output += `| ${f.name} | ${f.runtime} | ${f.reason} |\n`;
	}
}

const outputFile = path.resolve(import.meta.dirname, "../http.local.md");
writeFileSync(outputFile, output);

console.log(output);
