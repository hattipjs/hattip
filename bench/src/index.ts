/* eslint-disable no-console */
import { exec, spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { writeFileSync } from "node:fs";
import { launchAndTest } from "kill-em-all";

const HOST = "http://localhost:3000";
const WARMUP_TIME = 1;
const BENCHMARK_TIME = 10;

const runtimes: Runtime[] = [
	{
		name: "Node",
		runCommand: "node",
	},
	{
		name: "Bun",
		runCommand: "bun run",
	},
	{
		name: "Deno",
		runCommand: "deno run --allow-net --allow-env",
	},
	// {
	// 	name: "Cloudflare",
	// 	runCommand: "wrangler dev --log-level=none --port 3000",
	// 	excludeFromSummary: true,
	// 	intro:
	// 		"These benchmarks run locally via `wrangler` and do not reflect production Cloudflare Workers performance. Included for reference only.",
	// },
];

const nodeCompatibles: RuntimeName[] = ["Node", "Bun", "Deno"];

const entries: Entry[] = [
	// Baseline servers
	{
		name: "node:http",
		entry: "node-http.ts",
		supportedRuntimes: nodeCompatibles,
	},

	// Hattip
	{
		name: "Hattip",
		entry: "hattip-node.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Hattip (node:http)",
		entry: "hattip-node.ts",
		supportedRuntimes: ["Bun", "Deno"],
	},
	{
		name: "Hattip",
		entry: "hattip-bun.ts",
		supportedRuntimes: ["Bun"],
	},
	{
		name: "Hattip",
		entry: "hattip-deno.ts",
		supportedRuntimes: ["Deno"],
	},
	{
		name: "Hattip (uwebsockets)",
		entry: "hattip-uws.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Hattip",
		entry: "hattip-cloudflare.ts",
		supportedRuntimes: ["Cloudflare"],
	},

	// Others
	{
		name: "Elysia",
		entry: "elysia-bun.ts",
		supportedRuntimes: ["Bun"],
	},
	{
		name: "Elysia",
		entry: "elysia-node.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Express",
		entry: "express.ts",
		supportedRuntimes: nodeCompatibles,
	},
	{
		name: "Fastify",
		entry: "fastify.ts",
		supportedRuntimes: nodeCompatibles,
	},
	{
		name: "h3",
		entry: "h3.ts",
		supportedRuntimes: [...nodeCompatibles, "Cloudflare"],
	},
	{
		name: "Hono",
		entry: "hono-node.ts",
		supportedRuntimes: ["Node"],
	},
	{
		name: "Hono",
		entry: "hono-bun.ts",
		supportedRuntimes: ["Bun"],
	},
	{
		name: "Hono",
		entry: "hono-deno.ts",
		supportedRuntimes: ["Deno"],
	},
	{
		name: "Hono",
		entry: "hono-cloudflare.ts",
		supportedRuntimes: ["Cloudflare"],
	},
];

const root = import.meta.dirname + "/../cases";

const execAsync = promisify(exec);

type RuntimeName = "Node" | "Bun" | "Deno" | "Cloudflare";
interface Runtime {
	name: RuntimeName;
	runCommand: string;
	only?: boolean;
	excludeFromSummary?: boolean;
	intro?: string;
}

interface Entry {
	name: string;
	entry: string;
	supportedRuntimes: RuntimeName[];
	only?: boolean;
}

interface BenchmarkEntry {
	name: string;
	runtime: RuntimeName;
	command: string;
	results: number[];
}

const benchmarkEntries: BenchmarkEntry[] = [];

const hasOnlyRuntime = runtimes.some((runtime) => runtime.only);
const hasOnlyEntry = entries.some((entry) => entry.only);

for (const runtime of runtimes) {
	if (hasOnlyRuntime && !runtime.only) {
		continue;
	}

	for (const entry of entries) {
		if (hasOnlyEntry && !entry.only) {
			continue;
		}

		if (entry.supportedRuntimes.includes(runtime.name)) {
			const filename = path.resolve(root + "/" + entry.entry);
			benchmarkEntries.push({
				name: entry.name,
				runtime: runtime.name,
				command: `${runtime.runCommand} ${filename}`,
				results: [],
			});
		}
	}
}

async function doFetch(url: string, init?: RequestInit) {
	// console.log("Testing", url);
	return fetch(HOST + url, { ...init, signal: AbortSignal.timeout(1000) });
}

async function runTests() {
	const index = await doFetch("/");

	if ((await index.text()) !== "Hi") throw new Error("Index: Result not match");

	if (!index.headers.get("Content-Type")?.includes("text/plain"))
		throw new Error("Index: Content-Type not match");

	const query = await doFetch("/id/1?name=foo");
	const queryText = await query.text();
	if (queryText !== "1 foo")
		throw new Error(`Query: Result not match ${queryText}`);

	if (!query.headers.get("Content-Type")?.includes("text/plain"))
		throw new Error("Query: Content-Type not match");

	if (!query.headers.get("X-Powered-By")?.includes("benchmark"))
		throw new Error("Query: X-Powered-By not match");

	const body = await doFetch("/json", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			hello: "world",
		}),
	});

	const t = await body.text();
	if (t !== JSON.stringify({ hello: "world" }))
		throw new Error(`Body: Result not match: ${t}`);

	if (!body.headers.get("Content-Type")?.includes("application/json"))
		throw new Error("Body: Content-Type not match");
}

interface Benchmark {
	name: string;
	command: (time: number) => string;
}

const benchmarks: Benchmark[] = [
	{
		name: "Ping",
		command: (time) =>
			`bombardier --fasthttp -c 500 -d ${time}s http://127.0.0.1:3000/`,
	},
	{
		name: "Query",
		command: (time) =>
			`bombardier --fasthttp -c 500 -d ${time}s http://127.0.0.1:3000/id/1?name=bun`,
	},
	{
		name: "Body",
		command: (time) =>
			`bombardier --fasthttp -c 500 -d ${time}s -m POST -H 'Content-Type:application/json' -b '{"hello":"world"}' http://127.0.0.1:3000/json`,
	},
];

const expectedTime =
	(benchmarkEntries.length *
		(benchmarks.length * (WARMUP_TIME + BENCHMARK_TIME) + 0.5)) |
	0;

const seconds = expectedTime % 60;
const minutes = (expectedTime / 60) | 0;

console.log(
	`${benchmarkEntries.length} entries will be benchmarked. Expect it to take ${minutes}m ${seconds}s.\n`,
);

for (const entry of benchmarkEntries) {
	console.log(`Benchmarking ${entry.name} on ${entry.runtime}`);

	const cp = spawn(entry.command, {
		shell: true,
		stdio: "inherit",
		env: {
			...process.env,
			NODE_ENV: "production",
		},
	});

	const kill = await launchAndTest(cp, HOST, 1000).catch((error) => {
		console.log("Launch failed");
		console.log(error);
	});

	if (!kill) {
		continue;
	}

	try {
		try {
			await runTests();
		} catch (error) {
			console.log("Tests failed!");
			console.log(error);
			continue;
		}

		// console.log("Tests passed");

		for (const benchmark of benchmarks) {
			// Warmup
			if (WARMUP_TIME) {
				await execAsync(benchmark.command(WARMUP_TIME));
			}

			// Bombard
			const output = await execAsync(benchmark.command(BENCHMARK_TIME));
			const lines = output.stdout.split("\n");
			const statLine = lines[4];
			const requestsPerSecond = statLine?.match(
				/\s*Reqs\/sec\s*(\d+\.?\d*)/,
			)?.[1];
			entry.results.push(Number(requestsPerSecond));
			console.log(`  ${benchmark.name}: ${requestsPerSecond} reqs/sec`);
		}

		// Prepend average
		entry.results.unshift(
			entry.results.reduce((prev, cur) => prev + cur, 0) / entry.results.length,
		);

		console.log();
	} finally {
		await kill();
	}
}

// Filter out entries that failed to launch (no results)
const completedEntries = benchmarkEntries.filter((e) => e.results.length > 0);
completedEntries.sort((a, b) => b.results[0]! - a.results[0]!);

function formatResult(result: number | undefined) {
	return !isFinite(result!) ? "FAILED" : result!.toFixed(2);
}

function formatTable(
	entriesToFormat: BenchmarkEntry[],
	columns: string[],
	rowCells: (entry: BenchmarkEntry) => string[],
) {
	const rows = entriesToFormat.map((entry) => [
		...rowCells(entry),
		...entry.results.map(formatResult),
	]);

	const widths = columns.map((col, i) =>
		Math.max(col.length, ...rows.map((row) => row[i]!.length)),
	);

	const pad = (s: string, w: number, align: "left" | "right") =>
		align === "left" ? s.padEnd(w) : s.padStart(w);

	// Text columns are left-aligned, numeric columns are right-aligned
	const textColCount = columns.length - benchmarks.length - 1;
	const align = (i: number): "left" | "right" =>
		i < textColCount ? "left" : "right";

	let table = `| ${columns.map((c, i) => pad(c, widths[i]!, align(i))).join(" | ")} |\n`;
	table += `|${widths.map((w, i) => (align(i) === "right" ? "-".repeat(w + 1) + ":" : "-".repeat(w + 2))).join("|")}|\n`;

	for (const row of rows) {
		table += `| ${row.map((c, i) => pad(c, widths[i]!, align(i))).join(" | ")} |\n`;
	}

	return table;
}

const benchmarkNames = ["Average", ...benchmarks.map((b) => b.name)];

async function getVersion(command: string) {
	try {
		const { stdout } = await execAsync(command);
		return stdout.trim();
	} catch {
		return null;
	}
}

const [nodeVersion, bunVersion, denoVersion, wranglerVersion] =
	await Promise.all([
		getVersion("node -v"),
		getVersion("bun -v"),
		getVersion("deno -v"),
		getVersion("wrangler -v"),
	]);

const runtimeIntros = new Map(
	runtimes.filter((r) => r.intro).map((r) => [r.name, r.intro!]),
);

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

let output = "# Hattip benchmark results\n\n";
output += `*${dateStr} at ${timeStr}*\n\n`;
output +=
	"Comparative HTTP framework benchmarks using [bombardier](https://github.com/codesenberg/bombardier) " +
	"with 500 concurrent connections. Each framework handles three workloads: a plain text response (Ping), " +
	"a request with URL parameters and query strings (Query), and a JSON POST body echo (Body). " +
	"Results are in requests per second (higher is better).\n\n";

const versionLines = [
	`- **OS:** ${os.type()} ${os.release()} (${os.arch()})`,
	`- **CPU:** ${os.cpus()[0]!.model} (${os.cpus().length} cores)`,
	`- **Memory:** ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
	nodeVersion && `- **Node:** ${nodeVersion.replace(/^v/i, "")}`,
	bunVersion && `- **Bun:** ${bunVersion}`,
	denoVersion && `- **Deno:** ${denoVersion.replace(/^deno\s*/i, "")}`,
	wranglerVersion &&
		`- **Wrangler:** ${wranglerVersion.replace(/.*wrangler\s*/i, "")}`,
].filter(Boolean);

output += versionLines.join("\n") + "\n\n";

const excludedRuntimes = new Set(
	runtimes.filter((r) => r.excludeFromSummary).map((r) => r.name),
);
const summaryEntries = completedEntries.filter(
	(e) => !excludedRuntimes.has(e.runtime),
);

output += "## All runtimes\n\n";
output += formatTable(
	summaryEntries,
	["Framework", "Runtime", ...benchmarkNames],
	(e) => [e.name, e.runtime],
);

// Per-runtime sections (in declaration order)
for (const runtime of runtimes) {
	const runtimeName = runtime.name;
	const runtimeEntries = completedEntries
		.filter((e) => e.runtime === runtimeName)
		.sort((a, b) => b.results[0]! - a.results[0]!);
	if (runtimeEntries.length > 0) {
		output += `\n## ${runtimeName}\n\n`;
		const intro = runtimeIntros.get(runtimeName);
		if (intro) {
			output += `**Note:** ${intro}\n\n`;
		}
		output += formatTable(
			runtimeEntries,
			["Framework", ...benchmarkNames],
			(e) => [e.name],
		);
	}
}

const outputFile = path.resolve(import.meta.dirname, "../results.local.md");
writeFileSync(outputFile, output);

console.log(output);
