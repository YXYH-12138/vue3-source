import { ASTNodeTypes, type ASTNode } from "./parser";
import {
	createArrayExpression,
	createCallExpression,
	createFunctionDeclaration,
	createReturnStatement,
	createStringLiteral
} from "./ast";

type NodeTransformsFunction = (node: ASTNode, context: TransformContext) => void | Function;

export interface TransformContext {
	parent?: ASTNode;
	childIndex?: number;
	currentNode?: ASTNode;
	replaceNode: (node: ASTNode) => void;
	removeNode: () => void;
	nodeTransforms: Array<NodeTransformsFunction>;
}

function traverseNode(ast: ASTNode, context: TransformContext) {
	context.currentNode = ast;

	const exitFns: Function[] = [];

	for (const transform of context.nodeTransforms) {
		const onExit = transform(context.currentNode, context);
		onExit && exitFns.push(onExit);
		// 转换函数可能会移除节点,需要进行判断
		if (!context.currentNode) return;
	}

	const children = context?.currentNode?.children;
	if (children) {
		for (let i = 0; i < children.length; i++) {
			// 添加上下文信息
			context.childIndex = i;
			context.parent = ast;
			traverseNode(children[i], context);
		}
	}

	// 退出函数执行 (倒序执行) A,B => B,A
	let len = exitFns.length;
	while (len--) {
		exitFns[len]();
	}
}

export function transform(ast: ASTNode, nodeTransforms: Array<NodeTransformsFunction>) {
	const context: TransformContext = {
		replaceNode(node) {
			context.parent!.children[context.childIndex!] = node;
			context.currentNode = node;
		},
		removeNode() {
			if (context.parent) {
				context.parent.children.splice(context.childIndex!, 1);
				context.currentNode = context.parent;
			}
		},
		nodeTransforms
	};

	traverseNode(ast, context);
}

/** 转换文本节点 */
export function transformText(node: ASTNode) {
	if (node.type !== ASTNodeTypes.Text) return;
	node.jsNode = createStringLiteral(node.content);
}

/** 转换元素节点 */
export function transformElement(node: ASTNode) {
	return () => {
		if (node.type !== ASTNodeTypes.Element) return;

		const callExp = createCallExpression("h", [createStringLiteral(node.tag)]);

		if (node.children) {
			node.children.length == 1
				? callExp.arguments.push(node.children[0].jsNode)
				: callExp.arguments.push(createArrayExpression(node.children.map((child) => child.jsNode)));
		}

		node.jsNode = callExp;
	};
}

/** 转换根节点 */
export function transformRoot(node: ASTNode) {
	return () => {
		if (node.type !== ASTNodeTypes.Root) return;

		node.jsNode = createFunctionDeclaration(
			"render",
			[],
			node.children ? [createReturnStatement(node.children.map((child) => child.jsNode))] : []
		);
	};
}
