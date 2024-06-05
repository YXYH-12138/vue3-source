// @ts-check
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import esbuild from "rollup-plugin-esbuild";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

/**
 * @template T
 * @template {keyof T} K
 * @typedef { Omit<T, K> & Required<Pick<T, K>> } MarkRequired
 */
/** @typedef {'cjs' | 'esm-bundler' | 'global'} PackageFormat */
/** @typedef {MarkRequired<import('rollup').OutputOptions, 'file' | 'format'>} OutputOptions */

if (!process.env.TARGET) {
	throw new Error("TARGET package must be specified via --environment flag.");
}

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const packagesDir = path.resolve(__dirname, "./packages");
const packageDir = path.resolve(packagesDir, process.env.TARGET);

const resolve = (/** @type {string} */ p) => path.resolve(packageDir, p);
const pkg = require(resolve("package.json"));
const packageOptions = pkg.buildOptions || {};

// 打包后的文件名称
const name = packageOptions.filename || path.basename(packageDir);

const defaultFormats = ["esm-bundler"];
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(",");
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats;

/** @type {Record<PackageFormat, OutputOptions>} */
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

/**
 *
 * @param {PackageFormat} format
 * @param {OutputOptions} output
 * @returns {import('rollup').RollupOptions}
 */
function createConfig(format, output) {
	output.sourcemap = !!process.env.SOURCE_MAP;
	output.name = packageOptions.name;

	let external = [];
	// global是不需要做排除的
	if (format === "cjs" || format === "esm-bundler") {
		external = [...external, ...Object.keys(pkg.dependencies || {})];
	}

	return {
		input: resolve("./src/index.ts"),
		plugins: [
			nodeResolve(),
			commonjs(),
			esbuild({
				tsconfig: path.resolve(__dirname, "tsconfig.build.json"),
				sourceMap: output.sourcemap,
				minify: false,
				target: "es2016"
				// define: resolveDefine()
			})
		],
		external,
		output
	};
}

export default packageConfigs;
