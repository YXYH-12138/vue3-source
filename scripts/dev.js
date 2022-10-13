const { resolve } = require("path");
const { build } = require("esbuild");
const args = require("minimist")(process.argv.slice(2));

const target = args._[0];
const format = args.f;

const baseName = resolve(__dirname, "../packages", target);

const pkg = require(resolve(baseName, "package.json"));

const outputFormat = format.startsWith("global") ? "iife" : format === "cjs" ? "cjs" : "esm";

const outfile = resolve(baseName, `dist/${target}.${format}.js`);

build({
	// 入口
	entryPoints: [resolve(baseName, "src/index.ts")],
	// 全部打包到一起
	bundle: true,
	// 输出文件
	outfile,
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
