import fs from "node:fs";

export function scanDir(dir: string, root: string): string[] {
	const files = fs.readdirSync(dir);
	const result: string[] = [];
	for (const file of files) {
		const path = `${dir}/${file}`;
		const stat = fs.statSync(path);
		if (stat.isDirectory()) {
			result.push(...scanDir(path, root));
		} else {
			result.push(path.replace(/\\/g, "/").slice(root.length));
		}
	}

	return result;
}
