import { TokenTypes, tokenize } from "./tokenize";

export interface ASTNode {
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
 * 将模板字符串解析为模板 AST
 * @param template
 * @returns
 */
export function parser(template: string) {
	const tokens = tokenize(template);

	const ast: ASTNode = { type: ASTNodeTypes.Root, children: [] };

	const elementStack: ASTNode[] = [ast];

	// 向栈顶元素添加子元素
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
				// 遇到开始标记，压入栈中
				elementStack.push(el);
				break;
			case TokenTypes.Text:
				pushElement({ type: "Text", content: token.content });
				break;
			case TokenTypes.TagEnd:
				// 遇到结束标记，将栈顶元素弹出
				elementStack.pop();
				break;
			default:
				break;
		}
	}

	return ast;
}
