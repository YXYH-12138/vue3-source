module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true
	},
	// "plugin:@typescript-eslint/recommended"
	extends: ["eslint:recommended"],
	overrides: [],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module"
	},
	plugins: ["@typescript-eslint"],
	rules: {
		indent: ["error", "tab"],
		"linebreak-style": ["error", "windows"],
		semi: ["error", "always"]
	}
};
