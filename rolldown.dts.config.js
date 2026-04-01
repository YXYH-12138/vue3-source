// @ts-check
import { dts } from "rolldown-plugin-dts";

const targets = process.env.TARGETS ? process.env.TARGETS.split(",") : [];

export default targets.map(
	/** @returns {import('rolldown').BuildOptions} */
	(pkg) => {
		return {
			input: `packages/${pkg}/src/index.ts`,
			output: {
				file: `packages/${pkg}/dist/${pkg}.d.ts`,
				format: "es"
			},
			plugins: [dts({ resolver: "oxc" })]
		};
	}
);
