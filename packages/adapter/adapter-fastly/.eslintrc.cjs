require("@cyco130/eslint-config/patch");

module.exports = {
	root: true,
	ignorePatterns: ["dist", "node_modules", "**/*.cjs"],
	extends: ["@cyco130/eslint-config/node"],
	parserOptions: { project: [__dirname + "/tsconfig.json"] },
	settings: {
		"import/resolver": {
			typescript: {
				project: [__dirname + "/tsconfig.json"],
			},
		},
	},
	rules: {
		"import/no-unresolved": [
			"error",
			{
				ignore: ["^fastly:"],
			},
		],
	},
};
