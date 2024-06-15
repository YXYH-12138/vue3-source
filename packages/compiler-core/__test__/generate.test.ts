import { generate } from "../src/generate";
import { parser } from "../src/parser";
import { transform } from "../src/transformer";

describe("generate", () => {
	it("should generate code for simple template", () => {
		const ast = parser(`<div><p>Vue</p><p>Template</p></div>`);
		transform(ast);
		const code = generate(ast.jsNode);

		expect(code).toBe(
			`function render() {\n  return h("div", [h("p", "Vue"), h("p", "Template")])\n}`
		);
	});
});
