import { parse } from "@babel/core";
// @ts-expect-error: no types
import babelTs from "@babel/preset-typescript";
import babelTraverse from "@babel/traverse";

const traverse = babelTraverse.default;

export function replace(code: string, cb: (moduleName: string) => string) {
	const ast = parse(code, {
		filename: "foo.ts",
		presets: [babelTs],
	});

	if (!ast) {
		throw new Error("Failed to parse code");
	}

	interface Found {
		name: string;
		start: number;
		end: number;
	}

	const found: Found[] = [];

	traverse(ast, {
		enter(path) {
			if (path.isImportDeclaration()) {
				found.push({
					name: path.node.source.value,
					start: path.node.source.start!,
					end: path.node.source.end!,
				});
			} else if (
				path.isCallExpression() &&
				path.node.callee.type === "Import"
			) {
				const arg = path.node.arguments[0];
				if (arg.type === "StringLiteral") {
					found.push({
						name: arg.value,
						start: arg.start!,
						end: arg.end!,
					});
				} else {
					throw new Error("Unexpected argument type");
				}
			} else if (path.isExportDeclaration()) {
				if (
					"source" in path.node &&
					path.node.source?.type === "StringLiteral"
				) {
					found.push({
						name: path.node.source.value,
						start: path.node.source.start!,
						end: path.node.source.end!,
					});
				}
			} else if (path.isTSModuleDeclaration()) {
				if (path.node.id.type === "StringLiteral") {
					found.push({
						name: path.node.id.value,
						start: path.node.id.start!,
						end: path.node.id.end!,
					});
				}
			}
		},
	});

	for (const match of code.matchAll(
		/\/\/\/\s*<reference\s+types=['"]([^'"]+)['"]\s*\/>/g,
	)) {
		const start = code.indexOf(match[1], match.index!) - 1;
		const end = start + match[1].length + 2;
		found.push({ name: match[1], start, end });
	}

	found.sort((a, b) => b.start - a.start);

	let out = code;
	for (const { name, start, end } of found) {
		const newName = cb(name);
		out = out.slice(0, start) + JSON.stringify(newName) + out.slice(end);
	}

	return out;
}
