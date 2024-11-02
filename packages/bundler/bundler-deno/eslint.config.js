import config from "@cyco130/eslint-config/node";

/** @type {typeof config} */
export default [
	...config,
	{
		ignores: ["dist/", "node_modules/", "cli.js"],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				// @ts-expect-error: import.meta.dirname comes from Node types
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
];
