require("@cyco130/eslint-config/patch");

module.exports = {
  extends: ["@cyco130/eslint-config/node"],
  parserOptions: { tsconfigRootDir: __dirname },
  rules: {
    "import/no-unresolved": [
      "error",
      {
        ignore: ["@vavite/handler"],
      },
    ],
  },
};
