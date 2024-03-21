// @ts-check

import fs from "fs";
import { cpus } from "os";
import minimist from "minimist";
import execa from "execa";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// type BuildFn = (target: string) => Promise<void>;

const args = minimist(process.argv.slice(2));

const formats = args.formats || args.f;
const devOnly = args.devOnly || args.d;
const sourceMap = (args.sourcemap || args.s) ?? true;

const allTarget = fs.readdirSync("packages").filter((f) => {
	if (!fs.statSync(`packages/${f}`).isDirectory()) return false;
	const pkg = require(`../packages/${f}/package.json`);
	if (!pkg.buildOptions && pkg.private) return false;
	return true;
});

buildAll(allTarget);

function buildAll(targets) {
	runParallel(cpus.length, targets, build);
}

/**
 * 并行打包
 * @param {*} maxConcurrency 最大打包个数
 * @param {*} targets 需要打包的路径数组
 * @param {*} iteratorFn 回调
 */
async function runParallel(maxConcurrency, targets, iteratorFn) {
	const excuteing = [];
	const ret = [];
	for (const target of targets) {
		const p = Promise.resolve().then(() => iteratorFn(target));
		ret.push(p);
		if (maxConcurrency < targets.length) {
			const e = p.then(() => excuteing.splice(excuteing.indexOf(e), 1));
			excuteing.push(e);
			if (excuteing.length >= maxConcurrency) {
				await Promise.race(excuteing);
			}
		}
	}
	await Promise.all(ret);
}

async function build(target) {
	const env = devOnly ? "development" : "production";

	await execa(
		"rollup",
		[
			"-c",
			"--environment",
			[
				`NODE_ENV:${env}`,
				`TARGET:${target}`,
				formats ? `FORMATS:${formats}` : "",
				sourceMap ? "SOURCE_MAP:true" : ""
			]
				.filter(Boolean)
				.join(",")
		],
		{ stdio: "inherit" }
	);
}
