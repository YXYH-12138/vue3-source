import { ASTNodeTypes, parser, type ASTNode } from "../src/parser";
import { transform, type TransformContext } from "../src/transformer";

describe("traverseNode", () => {
	it("should traverse node", () => {
		function transformNode(node: ASTNode, context: TransformContext) {
			if (node.tag === "p") {
				node.tag = "h1";
			}
		}
		function setContent(node: ASTNode, context: TransformContext) {
			if (node.type === ASTNodeTypes.Text) {
				node.content = "set Vue";
			}
		}
		const ast = parser("<p>Vue</p>");
		transform(ast, [transformNode, setContent]);

		expect(ast).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "h1",
					children: [{ type: ASTNodeTypes.Text, content: "set Vue" }]
				}
			]
		});
	});

	it("should replaceNode node", () => {
		function replaceNode(node: ASTNode, context: TransformContext) {
			if (node.tag === "h2") {
				context.replaceNode({
					type: ASTNodeTypes.Element,
					tag: "div",
					children: [{ type: ASTNodeTypes.Text, content: "replace Vue" }]
				});
			}
		}

		const ast = parser("<p>Vue</p><h2>div Vue</h2>");
		transform(ast, [replaceNode]);

		expect(ast).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "p",
					children: [{ type: ASTNodeTypes.Text, content: "Vue" }]
				},
				{
					type: ASTNodeTypes.Element,
					tag: "div",
					children: [{ type: ASTNodeTypes.Text, content: "replace Vue" }]
				}
			]
		});
	});

	it("should removeNode node", () => {
		function removeNode1(node: ASTNode, context: TransformContext) {
			if (node.tag === "h2") {
				context.removeNode();
			}
		}
		const ast1 = parser("<p>Vue</p><h2>div Vue</h2>");
		transform(ast1, [removeNode1]);
		expect(ast1).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "p",
					children: [{ type: ASTNodeTypes.Text, content: "Vue" }]
				}
			]
		});

		function removeNode2(node: ASTNode, context: TransformContext) {
			if (node.type === ASTNodeTypes.Text) {
				context.removeNode();
			}
		}
		const ast2 = parser("<p>Vue</p><h2>div Vue</h2>");
		transform(ast2, [removeNode2]);
		expect(ast2).deep.equal({
			type: ASTNodeTypes.Root,
			children: [
				{
					type: ASTNodeTypes.Element,
					tag: "p",
					children: []
				},
				{
					type: ASTNodeTypes.Element,
					tag: "h2",
					children: []
				}
			]
		});
	});

	it("should excute exit fucntion", () => {
		const stack: string[] = [];

		function exitA() {
			stack.push("entry A");
			return () => {
				stack.push("leave A");
			};
		}
		function exitB() {
			stack.push("entry B");
			return () => {
				stack.push("leave B");
			};
		}
		const ast1 = parser("");
		transform(ast1, [exitA, exitB]);
		expect(stack).toEqual(["entry A", "entry B", "leave B", "leave A"]);
	});
});
