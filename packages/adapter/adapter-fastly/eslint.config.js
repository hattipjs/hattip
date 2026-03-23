import config from "@cyco130/eslint-config/node";

/** @type {typeof config} */
export default [
	...config,
	{
		ignores: ["dist/", "node_modules/"],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				// @ts-expect-error: Node types are not included in this package, so we need to ignore this error
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"import-x/extensions": ["error", "always", { ignorePackages: true }],
		},
	},
];
