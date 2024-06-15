import { VNodeType } from "@mini-vue/runtime-core";

export const enum NodeTypes {
	StringLiteral = "StringLiteral",
	Identifier = "Identifier",
	ArrayExpression = "ArrayExpression",
	CallExpression = "CallExpression",
	FunctionDeclaration = "FunctionDeclaration",
	ReturnStatement = "ReturnStatement"
}

export function createStringLiteral(value: string) {
	return {
		type: NodeTypes.StringLiteral,
		value
	};
}

export function createIdentifier(name: string) {
	return {
		type: NodeTypes.Identifier,
		name
	};
}

export function createArrayExpression(elements: any[]) {
	return {
		type: NodeTypes.ArrayExpression,
		elements
	};
}

export function createCallExpression(callee: string, _arguments: any[]) {
	return {
		type: NodeTypes.CallExpression,
		callee: createIdentifier(callee),
		arguments: _arguments
	};
}

export function createFunctionDeclaration(name: string, params: any[], body: any) {
	return {
		type: NodeTypes.FunctionDeclaration,
		id: createIdentifier(name),
		params,
		body
	};
}

export function createReturnStatement(returnStatement: any[]) {
	return {
		type: NodeTypes.ReturnStatement,
		return:
			returnStatement.length === 1
				? returnStatement[0]
				: // 处理多个根节点的情况
				  createCallExpression("h", [
						createStringLiteral(VNodeType.Fragment),
						createArrayExpression(returnStatement)
				  ])
	};
}
