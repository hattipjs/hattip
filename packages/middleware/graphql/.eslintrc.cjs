require("@cyco130/eslint-config/patch");

module.exports = {
	root: true,
	ignorePatterns: ["node_modules", "dist", "**/*.cjs", "**/*.js"],
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
