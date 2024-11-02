import config from "@cyco130/eslint-config/node";

/** @type {typeof config} */
export default [
	...config,
	{
		ignores: ["dist/", "node_modules/", "hattip.js"],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
];
