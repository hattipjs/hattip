require("@cyco130/eslint-config/patch");

module.exports = {
	root: true,
	extends: ["@cyco130/eslint-config/node"], // or react instead of node
	parserOptions: { tsconfigRootDir: __dirname },
	settings: {
		"import/resolver": {
			typescript: {
				project: [__dirname + "/tsconfig.json"],
			},
		},
	},
};
