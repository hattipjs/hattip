export default {
	"**/*.ts?(x)": [
		() => "tsc -p tsconfig.json --noEmit",
		"eslint --max-warnings 0 --ignore-pattern dist",
		"vitest related --run",
	],
	"*": "prettier --ignore-unknown --write",
};
