import { type ASTNode } from "./parser";

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
