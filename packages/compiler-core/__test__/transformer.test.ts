import { VNodeType } from "@mini-vue/runtime-core";
import { ASTNodeTypes, baseParse, type ASTNode } from "../src/parser";
import {
	transform,
	transformElement,
	transformRoot,
	transformText,
	type TransformContext
} from "../src/transformer";

describe("traverseNode", () => {
	it("should traverse node", () => {
		function transformNode(node: ASTNode, context: TransformContext) {
			if (node.tag === "p") {
				node.tag = "h1";
			}
		}
		function setContent(node: ASTNode, context: TransformContext) {
			if (node.type === ASTNodeTypes.TEXT) {
				node.content = "set Vue";
			}
		}
		const ast = baseParse("<p>Vue</p>");
		transform(ast, [transformNode, setContent]);

		expect(ast).deep.equal({
			type: ASTNodeTypes.ROOT,
			children: [
				{
					type: ASTNodeTypes.ELEMENT,
					tag: "h1",
					isSelfClosing: false,
					props: [],
					children: [{ type: ASTNodeTypes.TEXT, content: "set Vue" }]
				}
			]
		});
	});

	it("should replaceNode node", () => {
		function replaceNode(node: ASTNode, context: TransformContext) {
			if (node.tag === "h2") {
				context.replaceNode({
					type: ASTNodeTypes.ELEMENT,
					tag: "div",
					isSelfClosing: false,
					props: [],
					children: [{ type: ASTNodeTypes.TEXT, content: "replace Vue" }]
				});
			}
		}

		const ast = baseParse("<p>Vue</p><h2>div Vue</h2>");
		transform(ast, [replaceNode]);

		expect(ast).deep.equal({
			type: ASTNodeTypes.ROOT,
			children: [
				{
					type: ASTNodeTypes.ELEMENT,
					isSelfClosing: false,
					props: [],
					tag: "p",
					children: [{ type: ASTNodeTypes.TEXT, content: "Vue" }]
				},
				{
					type: ASTNodeTypes.ELEMENT,
					tag: "div",
					isSelfClosing: false,
					props: [],
					children: [{ type: ASTNodeTypes.TEXT, content: "replace Vue" }]
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
		const ast1 = baseParse("<p>Vue</p><h2>div Vue</h2>");
		transform(ast1, [removeNode1]);
		expect(ast1).deep.equal({
			type: ASTNodeTypes.ROOT,
			children: [
				{
					type: ASTNodeTypes.ELEMENT,
					tag: "p",
					isSelfClosing: false,
					props: [],
					children: [{ type: ASTNodeTypes.TEXT, content: "Vue" }]
				}
			]
		});

		function removeNode2(node: ASTNode, context: TransformContext) {
			if (node.type === ASTNodeTypes.TEXT) {
				context.removeNode();
			}
		}
		const ast2 = baseParse("<p>Vue</p><h2>div Vue</h2>");
		transform(ast2, [removeNode2]);
		expect(ast2).deep.equal({
			type: ASTNodeTypes.ROOT,
			children: [
				{
					type: ASTNodeTypes.ELEMENT,
					tag: "p",
					isSelfClosing: false,
					props: [],
					children: []
				},
				{
					type: ASTNodeTypes.ELEMENT,
					tag: "h2",
					isSelfClosing: false,
					props: [],
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
		const ast1 = baseParse("");
		transform(ast1, [exitA, exitB]);
		expect(stack).toEqual(["entry A", "entry B", "leave B", "leave A"]);
	});

	it("should transform to jsNode", () => {
		const ast1 = baseParse("<div><p>hello Vue</p><p>Template</p></div>");
		transform(ast1, [transformRoot, transformElement, transformText]);
		expect(ast1.jsNode).toEqual({
			type: "FunctionDeclaration", // 代表该节点是函数声明
			// 函数的名称是一个标识符，标识符本身也是一个节点
			id: {
				type: "Identifier",
				name: "render" // name 用来存储标识符的名称，在这里它就是渲染函数的名称 render
			},
			params: [] as any[], // 参数，目前渲染函数还不需要参数，所以这里是一个空数组
			// 渲染函数的函数体只有一个语句，即 return 语句
			body: [
				{
					type: "ReturnStatement",
					// 最外层的 h 函数调用
					return: {
						type: "CallExpression",
						callee: { type: "Identifier", name: "h" },
						arguments: [
							// 第一个参数是字符串字面量 'div'
							{
								type: "StringLiteral",
								value: "div"
							},
							// 第二个参数是一个数组
							{
								type: "ArrayExpression",
								elements: [
									// 数组的第一个元素是 h 函数的调用
									{
										type: "CallExpression",
										callee: { type: "Identifier", name: "h" },
										arguments: [
											// 该 h 函数调用的第一个参数是字符串字面量
											{ type: "StringLiteral", value: "p" },
											// 第二个参数也是一个字符串字面量
											{ type: "StringLiteral", value: "hello Vue" }
										]
									},
									// 数组的第二个元素也是 h 函数的调用
									{
										type: "CallExpression",
										callee: { type: "Identifier", name: "h" },
										arguments: [
											// 该 h 函数调用的第一个参数是字符串字面量
											{ type: "StringLiteral", value: "p" },
											// 第二个参数也是一个字符串字面量
											{ type: "StringLiteral", value: "Template" }
										]
									}
								]
							}
						]
					}
				}
			]
		});

		const ast2 = baseParse("<p>hello Vue</p><p>Template</p>");
		transform(ast2, [transformRoot, transformElement, transformText]);
		expect(ast2.jsNode).toEqual({
			type: "FunctionDeclaration", // 代表该节点是函数声明
			// 函数的名称是一个标识符，标识符本身也是一个节点
			id: {
				type: "Identifier",
				name: "render" // name 用来存储标识符的名称，在这里它就是渲染函数的名称 render
			},
			params: [], // 参数，目前渲染函数还不需要参数，所以这里是一个空数组
			// 渲染函数的函数体只有一个语句，即 return 语句
			body: [
				{
					type: "ReturnStatement",
					// 最外层的 h 函数调用
					return: {
						type: "CallExpression",
						callee: { type: "Identifier", name: "h" },
						arguments: [
							{
								type: "StringLiteral",
								value: VNodeType.Fragment
							},
							// 第二个参数是一个数组
							{
								type: "ArrayExpression",
								elements: [
									// 数组的第一个元素是 h 函数的调用
									{
										type: "CallExpression",
										callee: { type: "Identifier", name: "h" },
										arguments: [
											// 该 h 函数调用的第一个参数是字符串字面量
											{ type: "StringLiteral", value: "p" },
											// 第二个参数也是一个字符串字面量
											{ type: "StringLiteral", value: "hello Vue" }
										]
									},
									// 数组的第二个元素也是 h 函数的调用
									{
										type: "CallExpression",
										callee: { type: "Identifier", name: "h" },
										arguments: [
											// 该 h 函数调用的第一个参数是字符串字面量
											{ type: "StringLiteral", value: "p" },
											// 第二个参数也是一个字符串字面量
											{ type: "StringLiteral", value: "Template" }
										]
									}
								]
							}
						]
					}
				}
			]
		});
	});
});
