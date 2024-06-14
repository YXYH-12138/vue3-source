import { TokenTypes, tokenize } from "./tokenize";

interface ASTNode {
	type: string;
	tag?: string;
	children?: ASTNode[];
	content?: string;
	// loc?: SourceLocation;
	[key: string]: any;
}

export const enum ASTNodeTypes {
	Root = "Root",
	Text = "Text",
	Element = "Element"
}

/**
 * 1. 用来将模板字符串解析为模板 AST 的解析器 parser
 * 2. 用来将模板 AST 转换为 JavaScript AST 的转换器 transformer
 * 3. 用来根据 JavaScript AST 生成渲染函数代码的生成器 generator
 */

export function parser(template: string) {
	const tokens = tokenize(template);

	const ast: ASTNode = { type: ASTNodeTypes.Root, children: [] };

	const elementStack: ASTNode[] = [ast];

	const pushElement = (el: ASTNode) => {
		const parent = elementStack[elementStack.length - 1];
		parent.children.push(el);
		return el;
	};

	while (tokens.length) {
		const token = tokens.shift();
		switch (token.type) {
			case TokenTypes.Tag:
				const el = pushElement({ type: ASTNodeTypes.Element, tag: token.name, children: [] });
				elementStack.push(el);
				break;
			case TokenTypes.Text:
				pushElement({ type: "Text", content: token.content });
				break;
			case TokenTypes.TagEnd:
				elementStack.pop();
				break;
			default:
				break;
		}
	}

	return ast;
}
