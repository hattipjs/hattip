import { Plugin } from "vite";
import { findServerEntry } from "./inject-config";

interface DefaultNodeEntryOptions {
	hattipEntry?: string;
}

export function defaultNodeEntry(options: DefaultNodeEntryOptions): Plugin {
	let root: string;
	let hattipEntry = options.hattipEntry;

	return {
		name: "hattip:default-node-entry",

		enforce: "pre",

		config(config) {
			root = config.root ?? process.cwd();
		},

		async resolveId(source, importer, options) {
			if (!options.ssr || source !== "virtual:hattip:default-node-entry") {
				return;
			}

			const entry = await findServerEntry(root, true);
			if (entry) {
				const resolved = await this.resolve(entry, importer, {
					...options,
					skipSelf: true,
				});

				if (resolved) return resolved;
			}

			hattipEntry = hattipEntry ?? (await findServerEntry(root, false));

			return "virtual:hattip:default-node-entry";
		},

		async load(id) {
			if (id === "virtual:hattip:default-node-entry") {
				return makeDefaultNodeEntry(hattipEntry);
			}
		},
	};
}

function makeDefaultNodeEntry(hattipEntry: string | undefined) {
	if (!hattipEntry) {
		throw new Error("No hattip entry found");
	}

	return `
		import handler from ${JSON.stringify(hattipEntry)};
		import { createMiddleware } from "@hattip/adapter-node";
		export default createMiddleware(handler);
	`;
}
