import { baseParse, NodePropsTypes, ASTNodeTypes, type ASTNode } from "../src";

describe("DOM parser", () => {
	describe("text", () => {
		test("simple text", () => {
			const ast = baseParse("some text");
			const text = ast.children[0];

			expect(text).toStrictEqual({
				type: ASTNodeTypes.TEXT,
				content: "some text"
			});
		});

		test("simple text with invalid end tag", () => {
			const ast = baseParse("some text</div>");
			const text = ast.children[0];

			expect(text).toStrictEqual({
				type: ASTNodeTypes.TEXT,
				content: "some text"
			});
		});

		test("text with interpolation", () => {
			const ast = baseParse("some {{ foo + bar }} text");
			const text1 = ast.children[0];
			const text2 = ast.children[2];

			// ast.children[1] 应该是 interpolation
			expect(text1).toStrictEqual({
				type: ASTNodeTypes.TEXT,
				content: "some "
			});
			expect(text2).toStrictEqual({
				type: ASTNodeTypes.TEXT,
				content: " text"
			});
		});
	});

	describe("Interpolation", () => {
		test("simple interpolation", () => {
			// 1. 看看是不是一个 {{ 开头的
			// 2. 是的话，那么就作为 插值来处理
			// 3. 获取内部 message 的内容即可
			const ast = baseParse("{{ message }}");
			const interpolation = ast.children[0];

			expect(interpolation).toStrictEqual({
				type: ASTNodeTypes.INTERPOLATION,
				content: {
					type: ASTNodeTypes.SIMPLE_EXPRESSION,
					content: `message`
				}
			});
		});
	});

	describe("COMMENT", () => {
		test("simple comment", () => {
			const ast = baseParse("<!-- some comment -->");
			const comment = ast.children[0];

			expect(comment).toStrictEqual({
				type: ASTNodeTypes.COMMENT,
				content: " some comment "
			});
		});

		test("comment with element", () => {
			const ast = baseParse("<div><!-- some comment --></div>");
			const element = ast.children[0];

			expect(element).toStrictEqual({
				type: ASTNodeTypes.ELEMENT,
				tag: "div",
				isSelfClosing: false,
				props: [],
				// tagType: ElementTypes.ELEMENT,
				children: [
					{
						type: ASTNodeTypes.COMMENT,
						content: " some comment "
					}
				]
			});
		});
	});

	describe("ELEMENT", () => {
		test("simple div", () => {
			const ast = baseParse("<div>hello</div>");
			const element = ast.children[0];

			expect(element).toStrictEqual({
				type: ASTNodeTypes.ELEMENT,
				tag: "div",
				isSelfClosing: false,
				props: [],
				// tagType: ElementTypes.ELEMENT,
				children: [
					{
						type: ASTNodeTypes.TEXT,
						content: "hello"
					}
				]
			});
		});

		test("element with interpolation", () => {
			const ast = baseParse("<div>{{ msg }}</div>");
			const element = ast.children[0];

			expect(element).toStrictEqual({
				type: ASTNodeTypes.ELEMENT,
				tag: "div",
				isSelfClosing: false,
				props: [],
				// tagType: ElementTypes.ELEMENT,
				children: [
					{
						type: ASTNodeTypes.INTERPOLATION,
						content: {
							type: ASTNodeTypes.SIMPLE_EXPRESSION,
							content: `msg`
						}
					}
				]
			});
		});

		test("element with interpolation and text", () => {
			const ast = baseParse("<div>hi,{{ msg }}</div>");
			const element = ast.children[0];

			expect(element).toStrictEqual({
				type: ASTNodeTypes.ELEMENT,
				tag: "div",
				isSelfClosing: false,
				props: [],
				// tagType: ElementTypes.ELEMENT,
				children: [
					{
						type: ASTNodeTypes.TEXT,
						content: "hi,"
					},
					{
						type: ASTNodeTypes.INTERPOLATION,
						content: {
							type: ASTNodeTypes.SIMPLE_EXPRESSION,
							content: "msg"
						}
					}
				]
			});
		});

		test("element with attribute", () => {
			expect(baseParse('<div id="foo" v-show="display" @click="handleClick"></div>')).toEqual({
				type: ASTNodeTypes.ROOT,
				children: [
					{
						type: ASTNodeTypes.ELEMENT,
						tag: "div",
						isSelfClosing: false,
						props: [
							{ type: NodePropsTypes.Attribute, name: "id", value: "foo" },
							{ type: NodePropsTypes.Attribute, name: "v-show", value: "display" },
							{ type: NodePropsTypes.Attribute, name: "@click", value: "handleClick" }
						],
						children: []
					}
				]
			} as ASTNode);
		});

		test("element with nested element", () => {
			expect(baseParse('<div id="foo"><h2>h2 Vue</h2></div>')).toEqual({
				type: ASTNodeTypes.ROOT,
				children: [
					{
						type: ASTNodeTypes.ELEMENT,
						tag: "div",
						isSelfClosing: false,
						props: [{ type: NodePropsTypes.Attribute, name: "id", value: "foo" }],
						children: [
							{
								type: ASTNodeTypes.ELEMENT,
								tag: "h2",
								isSelfClosing: false,
								props: [],
								children: [{ type: ASTNodeTypes.TEXT, content: "h2 Vue" }]
							}
						]
					}
				]
			} as ASTNode);
		});

		test("should throw error when lack end tag  ", () => {
			expect(() => {
				baseParse("<div><span></div>");
			}).toThrow("span缺少闭合标签");
		});
	});
});
