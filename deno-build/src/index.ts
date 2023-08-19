import { fileURLToPath } from "node:url";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
	copyFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { replace } from "./replace.js";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

const denoBundlerPkg = readFileSync(
	resolve(rootDir, "packages/bundler/bundler-deno/package.json"),
	"utf8",
);
const esbuildVersion = JSON.parse(denoBundlerPkg).dependencies.esbuild.slice(1);

const externalModules: Record<string, string | undefined> = {
	// Virtual modules
	__STATIC_CONTENT_MANIFEST: "__STATIC_CONTENT_MANIFEST",
	"fastly:env": "fastly:env",

	esbuild: `https://deno.land/x/esbuild@v${esbuildVersion}/mod.js`,

	bun: "npm",
	"bun-types": "npm",
	"@cloudflare/kv-asset-handler": "npm",
	"@cloudflare/workers-types": "npm",
	"@fastly/js-compute": "npm",
	"netlify-lambda-types": "npm",
	"node-fetch-native": "npm",
	"@whatwg-node/fetch": "npm",
	cpr: "npm",
	cac: "npm",
	vite: "npm",

	"mime-types": "esm",
	cookie: "esm",

	"graphql-yoga": "./yoga.js",

	graphql: "esm",
	"@graphql-tools/schema": "esm",
	"@graphql-tools/utils": "esm",
	"@graphql-typed-document-node/core": "esm",
	dset: "esm",
	"urlpattern-polyfill":
		"data:application/javascript,const URLPattern=globalThis.URLPattern;export{URLPattern}",
};

const seen = new Set<string>();
const toBeCompiled = new Map<string, string>();

run();

function run() {
	rmSync(resolve(rootDir, "_deno/src"), { recursive: true, force: true });

	const packagesDir = resolve(rootDir, "packages");
	const packages = readdirSync(packagesDir, { withFileTypes: true });
	for (const pkg of packages) {
		if (pkg.isDirectory()) {
			processPackageGroup(packagesDir + "/" + pkg.name);
		}
	}

	for (const [name, path] of toBeCompiled) {
		compile(name, path);
	}

	let readme = readFileSync(resolve(rootDir, "readme.md"), "utf8");
	readme = readme.replaceAll(
		/\.\/packages\/.+\/([a-z-]+)/g,
		(_, match: string) => `./${match}`,
	);
	writeFileSync(resolve(rootDir, "_deno/src/readme.md"), readme);

	copyFileSync(
		resolve(rootDir, "LICENSE"),
		resolve(rootDir, "_deno/src/LICENSE"),
	);

	const { version } = JSON.parse(
		readFileSync(resolve(rootDir, "packages/base/core/package.json"), "utf8"),
	);

	writeFileSync(
		resolve(rootDir, "_deno/src/version.ts"),
		`export const version = ${JSON.stringify(version)};`,
	);
}

function processPackageGroup(dir: string) {
	const packages = readdirSync(dir, { withFileTypes: true });
	for (const pkg of packages) {
		if (pkg.isDirectory()) {
			processPackage(dir + "/" + pkg.name);
		}
	}
}

function processPackage(dir: string) {
	let packageJson: any;
	try {
		packageJson = JSON.parse(readFileSync(dir + "/package.json", "utf8"));
	} catch (error: any) {
		if (error?.code === "ENOENT") {
			return;
		}

		throw error;
	}

	const name = packageJson.name;
	if (!name.startsWith("@hattip/")) {
		throw new Error("Unexpected package name: " + name + " in " + dir);
	}

	const packageName = name.slice("@hattip/".length);

	if (packageName === "vite" || packageName === "adapter-uwebsockets") {
		return;
	}

	mkdirSync(resolve(rootDir, "_deno/src", packageName), { recursive: true });
	copyFileSync(
		resolve(dir, "readme.md"),
		resolve(rootDir, "_deno/src", packageName, "readme.md"),
	);

	const exports = packageJson.exports;
	let files: string[];

	if (!exports) {
		if (packageName !== "core") {
			throw new Error("Missing exports in " + dir);
		}

		files = ["index.d.ts"];
	} else if (packageName === "graphql") {
		files = ["src/index.ts", "dist/yoga.js"];
	} else {
		if (typeof exports === "string") {
			files = ["src/index.ts"];
		} else {
			files = Object.keys(exports).map(
				(key) => `src/${key.slice(2) || "index"}.ts`,
			);
		}
	}

	if (packageName === "walk" || packageName.startsWith("bundler-")) {
		files.push("src/cli.ts");
	}

	for (const file of files) {
		processFile(packageName, dir, file);
	}
}

function processFile(packageName: string, dir: string, file: string) {
	if (packageName === "static" && file === "src/fs.ts") {
		file = "src/fs.deno.ts";
	}

	const path = dir + "/" + file;
	if (!existsSync(path)) {
		throw new Error("Missing file " + path);
	}

	let name = basename(file.slice(0, file.indexOf(".")));

	const ext = path.endsWith(".js") ? ".js" : ".ts";
	if (name === "index") {
		name = "mod" + ext;
	} else {
		name += ext;
	}

	toBeCompiled.set(packageName + "/" + name, path);
	seen.add(path);
}

function compile(name: string, path: string) {
	const code = readFileSync(path, "utf8");
	let replaced = replace(code, (moduleName) => {
		if (moduleName.startsWith("@hattip/")) {
			let replaced = moduleName.slice("@hattip/".length);
			if (replaced.includes("/")) {
				replaced += ".ts";
			} else {
				replaced += "/mod.ts";
			}

			return "../" + replaced;
		}

		if (moduleName === "../package.json") {
			return "../version.ts";
		}

		const external = externalModules[moduleName];
		if (external === "npm" || external === "esm") {
			if (moduleName === "bun") {
				return "npm:bun";
			}

			const packagePath = path.slice(rootDir.length);
			const start = packagePath.match(/^(packages\/[^/]+\/[^/]+)/)![0];
			const pkgPath = resolve(rootDir, start, "package.json");
			const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
			const depVersion =
				pkg.dependencies?.[moduleName] || pkg.peerDependencies?.[moduleName];
			if (!depVersion) {
				throw new Error(`Missing dependency ${moduleName} in ${pkgPath}`);
			}
			const version = depVersion.startsWith("^")
				? depVersion.slice(1)
				: depVersion;

			if (external === "npm") {
				return `npm:${moduleName}@${version}`;
			} else {
				return `https://esm.sh/${moduleName}@${version}`;
			}
		}

		if (external) {
			return external;
		}

		if (moduleName.startsWith("node:")) {
			return moduleName;
		}

		if (!moduleName.startsWith(".")) {
			throw new Error("Unexpected module name: " + moduleName + " in " + path);
		}

		const resolved = resolveRelativeImport(path, moduleName);
		if (!seen.has(resolved)) {
			const short = strip(resolved);
			toBeCompiled.set(short, resolved);
			seen.add(resolved);
		}

		if (moduleName.endsWith(".js")) {
			return moduleName;
		}

		return moduleName === "." ? "./mod.ts" : moduleName + ".ts";
	});

	if (name === "graphql/yoga.ts") {
		const pkg = JSON.parse(
			readFileSync(
				resolve(rootDir, "packages/middleware/graphql/package.json"),
				"utf8",
			),
		);
		const version = pkg.devDependencies["graphql-yoga"].slice(1);
		replaced = `// @deno-types="npm:graphql-yoga@${version}"\n${replaced}`;
	}

	const outPath = resolve(rootDir, "_deno/src", name);
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, replaced);
}

function resolveRelativeImport(from: string, spec: string) {
	let result = resolve(dirname(from), spec === "." ? "index" : spec);

	if (result.endsWith(".js")) {
		return result;
	}

	result += ".ts";
	return result;
}

function strip(path: string) {
	const segments = path.split("/");
	const filename = segments.pop()!;
	const src = segments.pop()!;

	if (src !== "src" && src !== "dist") {
		throw new Error("Unexpected path: " + path);
	}

	const packageName = segments.pop()!;

	return packageName + "/" + filename;
}
