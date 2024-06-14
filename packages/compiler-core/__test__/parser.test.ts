import { parser, ASTNodeTypes } from "../src";

describe("parser", () => {
	it("should parse template", () => {
		expect(parser("<p>Vue</p>")).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "p",
					children: [{ type: ASTNodeTypes.Text, content: "Vue" }]
				}
			]
		});

		expect(parser("<div><p>Vue</p><p>Template</p></div>")).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "div",
					children: [
						{
							type: ASTNodeTypes.Element,
							tag: "p",
							children: [{ type: ASTNodeTypes.Text, content: "Vue" }]
						},
						{
							type: ASTNodeTypes.Element,
							tag: "p",
							children: [{ type: ASTNodeTypes.Text, content: "Template" }]
						}
					]
				}
			]
		});
	});
});
