// @ts-check

import { resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));

const target = args._[0];
const format = args.f;

const require = createRequire(import.meta.url);

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const baseName = resolve(__dirname, "../packages", target);

const pkg = require(resolve(baseName, "package.json"));

const outputFormat = format === "global" ? "iife" : format === "cjs" ? "cjs" : "esm";

const outfile = resolve(baseName, `dist/${target}.${format}.js`);

let externals = [];
// global是不需要做排除的
if (format === "cjs" || format === "esm-bundler") {
	externals = [...externals, ...Object.keys(pkg.dependencies || {})];
}

build({
	// 入口
	entryPoints: [resolve(baseName, "src/index.ts")],
	// 全部打包到一起
	bundle: true,
	// 输出文件
	outfile,
	external: externals,
	format: outputFormat,
	sourcemap: true,
	globalName: pkg.buildOptions?.name,
	platform: format === "cjs" ? "node" : "browser",
	watch: {
		onRebuild(error) {
			if (!error) console.log("rebuild");
		}
	}
}).then(() => {
	console.log("watching ~~~");
});
