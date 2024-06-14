import { parser, ASTNodeTypes } from "../src";

describe("parser", () => {
	it("should parse template", () => {
		expect(parser("<p>Vue</p><h2>h2 Vue</h2>")).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "p",
					children: [{ type: ASTNodeTypes.Text, content: "Vue" }]
				},
				{
					type: ASTNodeTypes.Element,
					tag: "h2",
					children: [{ type: ASTNodeTypes.Text, content: "h2 Vue" }]
				}
			]
		});

		expect(parser("<div><p>hello Vue</p><p>Template</p></div>")).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "div",
					children: [
						{
							type: ASTNodeTypes.Element,
							tag: "p",
							children: [{ type: ASTNodeTypes.Text, content: "hello Vue" }]
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
