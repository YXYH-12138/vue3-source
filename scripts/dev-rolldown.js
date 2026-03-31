// @ts-check

import { resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { watch } from "rolldown";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));

const target = args._[0];
const format = args.f ?? "esm";

const require = createRequire(import.meta.url);

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const baseName = resolve(__dirname, "../packages", target);

const pkg = require(resolve(baseName, "package.json"));

const outputFormat = format === "global" ? "iife" : format === "cjs" ? "cjs" : "esm";

const outfile = resolve(baseName, `dist/${target}.${format}.js`);

let externals = [];
// global是不需要做排除的
if (format === "cjs" || format === "esm") {
	externals = [...externals, ...Object.keys(pkg.dependencies || {})];
}

watch({
	// 入口
	input: [resolve(baseName, "src/index.ts")],
	external: externals,
	output: {
		minify: true,
		name: pkg.buildOptions?.name,
		file: outfile,
		format: outputFormat,
		sourcemap: true
	},
	platform: format === "cjs" ? "node" : "browser"
});
