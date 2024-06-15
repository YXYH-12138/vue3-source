import { NodeTypes } from "./ast";

type CodegenContext = ReturnType<typeof createCodegenContext>;

/**
 * 根据js ast生成代码
 * @param node
 * @returns
 */
export function generate(node: any) {
	const context = createCodegenContext();
	generateNode(node, context);

	return context.code;
}

function generateNode(node: any, content: CodegenContext) {
	switch (node.type) {
		case NodeTypes.FunctionDeclaration:
			generateFunction(node, content);
			break;
		case NodeTypes.ReturnStatement:
			generateReturnStatement(node, content);
			break;
		case NodeTypes.CallExpression:
			generateCallExpression(node, content);
			break;
		case NodeTypes.ArrayExpression:
			generateArrayExpression(node, content);
			break;
		case NodeTypes.StringLiteral:
			generateStringLiteral(node, content);
			break;
	}
}

function generateFunction(node: any, content: CodegenContext) {
	const { push, indent, deindent } = content;
	push(`function ${node.id.name}(`);
	// 生成函数参数
	generateNodeList(node.params, content);
	push(") {");
	indent();
	// 继续调用generateNode 生成函数体
	node.body.forEach((statement: any) => generateNode(statement, content));
	deindent();
	push("}");
}

function generateReturnStatement(node: any, content: CodegenContext) {
	const { push } = content;
	push("return ");
	generateNode(node.return, content);
}

function generateCallExpression(node: any, content: CodegenContext) {
	const { push } = content;
	push(node.callee.name + "(");
	generateNodeList(node.arguments, content);
	push(")");
}

function generateArrayExpression(node: any, content: CodegenContext) {
	const { push } = content;
	push("[");
	generateNodeList(node.elements, content);
	push("]");
}

function generateStringLiteral(node: any, content: CodegenContext) {
	const { push } = content;
	push(`"${node.value}"`);
}

function generateNodeList(nodes: any, content: CodegenContext) {
	const { push } = content;
	nodes.forEach((node: any, i: number) => {
		generateNode(node, content);
		if (i < nodes.length - 1) {
			push(", ");
		}
	});
}

function createCodegenContext() {
	const context = {
		code: "",
		indentLevel: 0,
		push(code: string) {
			context.code += code;
		},
		newLine() {
			context.code += "\n" + "  ".repeat(context.indentLevel);
		},
		indent() {
			context.indentLevel++;
			context.newLine();
		},
		deindent() {
			context.indentLevel--;
			context.newLine();
		}
	};

	return context;
}
