require("@cyco130/eslint-config/patch");

module.exports = {
	root: true,
	ignorePatterns: [
		"dist",
		"node_modules",
		"**/*.cjs",
		"cli.js",
		"deno-env-shim.js",
	],
	extends: ["@cyco130/eslint-config/node"],
	parserOptions: { project: [__dirname + "/tsconfig.json"] },
	settings: {
		"import/resolver": {
			typescript: {
				project: [__dirname + "/tsconfig.json"],
			},
		},
	},
};
