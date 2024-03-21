import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import typescript from "rollup-plugin-typescript2";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const packagesDir = path.resolve(__dirname, "./packages");
const packageDir = path.resolve(packagesDir, process.env.TARGET);

const resolve = (p) => path.resolve(packageDir, p);
const pkg = require(resolve("package.json"));
const packageOptions = pkg.buildOptions || {};

// 打包后的文件名称
const name = packageOptions.filename || path.basename(packageDir);

const defaultFormats = ["esm-bundler", "cjs"];
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(",");
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats;

const outputConfigs = {
	"esm-bundler": {
		file: resolve(`dist/${name}.esm-bundler.js`),
		format: "es"
	},
	cjs: {
		file: resolve(`dist/${name}.cjs.js`),
		format: "cjs"
	},
	global: {
		file: resolve(`dist/${name}.global.js`),
		format: "iife"
	}
};

const packageConfigs = packageFormats.map((format) => createConfig(format, outputConfigs[format]));

function createConfig(format, output) {
	output.sourcemap = !!process.env.SOURCE_MAP;
	output.name = packageOptions.name;

	let external = [];
	// global是不需要做排除的
	if (format === "cjs" || format === "esm-bundler") {
		external = [...external, ...Object.keys(pkg.dependencies || {})];
	}
	return [
		{
			input: resolve("./src/index.ts"),
			plugins: [
				nodeResolve(),
				commonjs(),
				typescript({
					tsconfig: path.resolve(__dirname, "tsconfig.json")
				})
			],
			external,
			output
			// onwarn: (msg, warn) => {
			// 	// 忽略 Circular 的错误
			// 	if (!/Circular/.test(msg)) {
			// 		warn(msg);
			// 	}
			// }
		},
		{
			input: resolve("./src/index.ts"),
			plugins: [dts()],
			output: {
				format: "es",
				file: resolve(`dist/${name}.d.ts`)
			}
		}
	];
}

export default packageConfigs.flat();
