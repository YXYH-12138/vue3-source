import { decodeHTML } from "entities";
// import { TokenTypes, tokenize } from "./tokenize";

export interface ASTNode {
	type: ASTNodeTypes;
	tag?: string;
	children?: ASTNode[];
	content?: string;
	props?: NodeProps[];
	isSelfClosing?: boolean;
	// loc?: SourceLocation;
	[key: string]: any;
}

interface NodeProps {
	name: string;
	value: any;
	type: NodePropsTypes;
}

export const enum ASTNodeTypes {
	ROOT = "ROOT",
	TEXT = "TEXT",
	ELEMENT = "ELEMENT",
	COMMENT = "COMMENT",
	INTERPOLATION = "INTERPOLATION",
	SIMPLE_EXPRESSION = "SIMPLE_EXPRESSION"
}

export const enum NodePropsTypes {
	Attribute = "Attribute"
}

/**
 * 将模板字符串解析为模板 AST
 * @param template
 * @returns
 */
// function parser(template: string) {
// 	const tokens = tokenize(template);

// 	const ast: ASTNode = { type: ASTNodeTypes.ROOT, children: [] };

// 	const elementStack: ASTNode[] = [ast];

// 	// 向栈顶元素添加子元素
// 	const pushElement = (el: ASTNode) => {
// 		const parent = elementStack[elementStack.length - 1];
// 		parent.children.push(el);
// 		return el;
// 	};

// 	while (tokens.length) {
// 		const token = tokens.shift();
// 		switch (token.type) {
// 			case TokenTypes.Tag:
// 				const el = pushElement({ type: ASTNodeTypes.ELEMENT, tag: token.name, children: [] });
// 				// 遇到开始标记，压入栈中
// 				elementStack.push(el);
// 				break;
// 			case TokenTypes.Text:
// 				pushElement({ type: ASTNodeTypes.TEXT, content: token.content });
// 				break;
// 			case TokenTypes.TagEnd:
// 				// 遇到结束标记，将栈顶元素弹出
// 				elementStack.pop();
// 				break;
// 			default:
// 				break;
// 		}
// 	}

// 	return ast;
// }

const enum TextModes {
	// 能解析标签，支持HTML实体
	// (实体具体指HTML中用 & 符号表示的特殊字符)
	DATA = "DATA",
	// 不能解析标签，支持HTML实体
	RCDATA = "RCDATA",
	// 不能解析标签，不支持HTML实体
	RAWTEXT = "RAWTEXT",
	// 不能解析标签，不支持HTML实体
	CDATA = "CDATA"
}

type ParserContext = {
	source: string;
	mode: TextModes;
	advanceBy(n: number): void;
	advanceSpaces(): void;
};

function createContext(str: string) {
	const context = {
		source: str,
		mode: TextModes.DATA,
		advanceBy(n: number) {
			context.source = context.source.slice(n);
		},
		advanceSpaces() {
			const match = /^(\s*)/.exec(context.source);
			if (match) {
				context.advanceBy(match[0].length);
			}
		}
	};

	return context;
}

export function baseParse(str: string): ASTNode {
	const context = createContext(str);

	const nodes = parseChildren(context, []);

	return {
		type: ASTNodeTypes.ROOT,
		children: nodes
	};
}

const isEl = (char: string) => /[a-z]/i.test(char);

const startsWithEndTagOpen = (tag: string, source: string) => {
	// 1. 头部 是不是以  </ 开头的
	// 2. 看看是不是和 tag 一样
	return (
		source.startsWith("</") && source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
	);
};

function parseChildren(context: ParserContext, ancestors: ASTNode[]) {
	let nodes: ASTNode[] = [];

	while (!isEnd(context, ancestors)) {
		const { source, mode } = context;
		let node: any;
		if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
			// 解析标签节点
			if (mode === TextModes.DATA && source[0] === "<") {
				// 解析注释
				if (source.startsWith("<!--")) {
					node = parseComment(context, ancestors);
				} else if (source[1] === "/") {
					// 这里是无效的结束标签 </div>
					parseTag(context, "end");
					continue;
				} else if (isEl(source[1])) {
					// 解析元素
					node = parseElement(context, ancestors);
				}
			} else if (source.startsWith("{{")) {
				// 解析插值
				node = parseInterpolation(context);
			}
		}

		if (!node) {
			node = parseText(context);
		}

		nodes.push(node);
	}

	return nodes;
}

function parseElement(context: ParserContext, ancestors: ASTNode[]) {
	const element = parseTag(context);
	if (element.isSelfClosing) return element;

	// 模式切换
	if (element.tag === "textarea" || element.tag === "title") {
		context.mode = TextModes.RCDATA;
	} else if (element.tag === "style" || element.tag === "script") {
		context.mode = TextModes.RAWTEXT;
	} else {
		context.mode = TextModes.DATA;
	}

	ancestors.push(element);
	element.children = parseChildren(context, ancestors);
	ancestors.pop();

	if (startsWithEndTagOpen(element.tag, context.source)) {
		parseTag(context, "end");
	} else {
		throw new Error(`${element.tag}缺少闭合标签`);
	}

	return element;
}

function parseTag(context: ParserContext, type: "start" | "end" = "start"): ASTNode {
	const { advanceBy, advanceSpaces } = context;

	const match =
		type === "start"
			? /^<([a-z][^\s/>]*)/i.exec(context.source)
			: /^<\/([a-z][^\s/>]*)/i.exec(context.source);

	const tag = match[1];
	// 消费匹配的全部内容，如 <div
	advanceBy(match[0].length);
	// 消耗空白字符
	advanceSpaces();

	// 解析属性
	const props = parseAttributes(context);

	// 是否自闭合
	const isSelfClosing = context.source.startsWith("/>");
	// 如果是自闭合标签，则消费 />,否则消费 >
	advanceBy(isSelfClosing ? 2 : 1);

	return { type: ASTNodeTypes.ELEMENT, tag, isSelfClosing, children: [], props };
}

function parseAttributes(context: ParserContext) {
	const { advanceBy, advanceSpaces } = context;

	const props: any[] = [];

	while (!/^\/?>/.test(context.source)) {
		const nameMatch = /^([^\s/>][^\s=/>]*)/i.exec(context.source);
		const name = nameMatch[0];
		// 消费属性名
		advanceBy(name.length);
		// 消费属性名称和等号之间的空白字符
		advanceSpaces();

		// 消费等于号
		advanceBy(1);
		// 消费等于号与属性值之前的空白字符
		advanceSpaces();

		let value = "";

		const quote = context.source[0];
		if (quote === "'" || quote === '"') {
			// 消费开始引号
			advanceBy(1);
			const endQuoteIndex = context.source.indexOf(quote);
			if (endQuoteIndex > -1) {
				// 获取属性值
				value = context.source.slice(0, endQuoteIndex);
				// 消费属性值
				advanceBy(value.length);
				// 消费结束引号
				advanceBy(1);
			} else {
				// TODO: 这里多个属性处理有问题 <div id="foo v-show="display"></div>
				throw new Error(`属性值缺少结束引号`);
			}
		} else {
			const match = /^[^\s/>]+/i.exec(context.source);
			value = match[0];
			// 消费属性值
			advanceBy(value.length);
		}
		// 消费属性值之后的空白字符
		advanceSpaces();

		props.push({ name, value, type: NodePropsTypes.Attribute });
	}

	return props;
}

function parseInterpolation(context: ParserContext) {
	const { advanceBy } = context;

	const openDelimiter = "{{";
	const closeDelimiter = "}}";

	const closeIndex = context.source.indexOf(closeDelimiter);
	if (closeIndex === -1) {
		throw new Error(`插值缺少结束符`);
	}

	// 消费{{
	advanceBy(openDelimiter.length);

	// 截取插值内容
	const content = context.source.slice(0, closeIndex - openDelimiter.length);
	advanceBy(content.length + closeDelimiter.length);

	return {
		type: ASTNodeTypes.INTERPOLATION,
		content: { type: ASTNodeTypes.SIMPLE_EXPRESSION, content: content.trim() }
	};
}

function parseText(context: ParserContext) {
	const { advanceBy, source } = context;

	const endTokens = ["<", "{{"];
	let endIndex = context.source.length;

	for (let i = 0; i < endTokens.length; i++) {
		const index = source.indexOf(endTokens[i]);
		// endIndex > index 是需要要 endIndex 尽可能的小
		// 比如说：
		// hi, {{123}} <div></div>
		// 那么这里就应该停到 {{ 这里，而不是停到 <div 这里
		if (index > -1 && index < endIndex) {
			endIndex = index;
		}
	}

	// 截取文本内容
	const content = context.source.slice(0, endIndex);
	// 消费文本内容
	advanceBy(endIndex);

	return { type: ASTNodeTypes.TEXT, content: decodeHTML(content) };
}

function parseComment(context: ParserContext, ancestors: ASTNode[]) {
	const { advanceBy } = context;

	const startComment = "<!--";
	const endComment = "-->";

	const endIndex = context.source.indexOf(endComment);
	if (endIndex === -1) {
		throw new Error("注释缺少结束符" + endComment);
	}

	advanceBy(startComment.length);

	const content = context.source.slice(0, endIndex - startComment.length);
	advanceBy(content.length + endComment.length);

	return { type: ASTNodeTypes.COMMENT, content };
}

function isEnd(context: ParserContext, ancestors: ASTNode[]) {
	// 检测标签的节点
	// 如果是结束标签的话，需要看看之前有没有开始标签，如果有的话，那么也应该结束
	// 这里的一个 edge case 是 <div><span></div>
	// 像这种情况下，其实就应该报错
	const s = context.source;

	if (s.startsWith("</")) {
		for (let i = ancestors.length - 1; i >= 0; i--) {
			const node = ancestors[i];
			if (startsWithEndTagOpen(node.tag, s)) {
				return true;
			}
		}
	}

	// 看看 context.source 还有没有值
	return !s;
}
