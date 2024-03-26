import { hasOwn, isArray, isString } from "@vue/shared";
import { opts } from "./opts";
import { type VNode, Text as TextType, Fragment } from "./vnode";

type Invoke = {
	(...arg: any[]): void;
	attached?: number;
	value?: (e: any) => void;
};

export interface RendererElement extends HTMLElement {
	_vnode?: VNode;
	_invoke?: Record<string, Invoke>;
}

export type HostElement = RendererElement | Text;

export interface RendererOptions {
	createElement: (tag: string) => RendererElement;
	patchProp: (el: RendererElement, key: string, prevValue: any, nextValue: any) => void;
	insert: (el: RendererElement | Text, parent: RendererElement, anchor?: HTMLElement) => void;
	remove: (el: HostElement) => void;
	createText: () => Text;
	setText: (el: Text, text: string) => void;
	setElementText: (el: HTMLElement, text: string) => void;
}

export function createRenderer({
	setElementText,
	createElement,
	createText,
	setText,
	remove,
	insert,
	patchProp
}: RendererOptions) {
	function render(vNode: VNode, container: RendererElement) {
		if (vNode) {
			// 如果有新的vnode，则patch
			patch(container._vnode, vNode, container);
		} else if (container._vnode) {
			// 如果没有新的vnode而且有旧的vnode，则删除
			unmount(container._vnode);
		}
		container._vnode = vNode;
	}

	// 卸载
	function unmount(vnode: VNode) {
		if (vnode.type === Fragment) {
			(vnode.children as VNode[]).forEach((v) => unmount(v));
		} else {
			remove(vnode.el);
		}
	}

	/** 对新节点和旧节点进行比较patch */
	function patch(n1: VNode | undefined, n2: VNode, container: RendererElement) {
		//  如果新旧node类型不同，直接卸载即可
		if (n1 && n1.type !== n2.type) {
			unmount(n1);
			n1 = null;
		}

		// 处理文本节点
		if (isString(n2.type)) {
			if (!n1) {
				mountElement(n2, container);
			} else {
				// 更新元素
				patchElement(n1, n2, container);
			}
			// 处理片段
		} else if (n2.type === Fragment) {
			if (!n1 && isArray(n2.children)) {
				n2.children.forEach((v) => patch(undefined, v, container));
			} else {
				patchChildren(n1, n2, container);
			}
			// 处理文本节点
		} else if (n2.type === TextType) {
			if (!n1) {
				const el = (n2.el = createText());
				insert(el, container);
			} else {
				const el = (n2.el = n1.el);
				if (n1.children !== n2.children) {
					setText(el as Text, n2.children as string);
				}
			}
		}
	}

	/** 比较子节点 */
	function patchChildren(n1: VNode | undefined, n2: VNode, el: RendererElement) {
		const oldChildren = n1.children;
		const newChildren = n2.children;

		/** 新子节点是一个文本节点 */
		if (isString(newChildren)) {
			// 多个子节点先全部删除
			if (isArray(oldChildren)) {
				oldChildren.forEach((v) => unmount(v));
			}
			if (oldChildren !== newChildren) {
				// 没有子节点或者是文本节点直接设置即可
				setElementText(el, newChildren);
			}
			/** 新节点是多个子节点 */
		} else if (isArray(newChildren)) {
			// 最复杂的情况 都是多个子节点
			if (isArray(oldChildren)) {
				diff(oldChildren, newChildren, el);
				// patchElement(oldChildren, newChildren, el);
			} else {
				/**
				 * 没有旧子节点或者旧子节点是文本子节点的情况
				 * 只需要将容器元素清空，然后逐个将新的一组子节点挂载到容器中
				 */
				if (isString(oldChildren) && oldChildren !== "") {
					setElementText(el, "");
				}
				newChildren.forEach((vnode) => patch(null, vnode, el));
			}
			/** 新节点是空 */
		} else {
			if (isString(oldChildren) && oldChildren !== "") {
				setElementText(el, "");
			} else if (isArray(oldChildren)) {
				oldChildren.forEach((v) => unmount(v));
			}
		}
	}

	/** 更新元素 */
	function patchElement(n1: VNode | undefined, n2: VNode, container: RendererElement) {
		const el = (n2.el = n1.el);
		const oldProps = n1.props;
		const newProps = n2.props;
		// 添加新的props
		for (const key in newProps) {
			if (oldProps[key] !== newProps[key]) {
				patchProp(el as RendererElement, key, oldProps[key], newProps[key]);
			}
		}
		// 删除旧的props
		for (const key in oldProps) {
			if (!hasOwn(newProps, key)) {
				patchProp(el as RendererElement, key, oldProps[key], null);
			}
		}

		patchChildren(n1, n2, el as RendererElement);
	}

	/** 挂载元素 */
	function mountElement(vnode: VNode, container: RendererElement) {
		const { type, props, children } = vnode;
		const el = (vnode.el = createElement(type as string));
		if (isString(children)) {
			setElementText(el, children);
		} else if (isArray(children)) {
			// 递归处理子元素
			children.forEach((child) => {
				patch(null, child, el);
			});
		}

		if (props) {
			for (const key in props) {
				patchProp(el, key, null, props[key]);
			}
		}

		insert(el, container);
	}

	function diff(n1: VNode[], n2: VNode[], el: RendererElement) {
		const oldLen = n1.length;
		const newLen = n2.length;

		// 记录最大的索引值
		let lastIndex = 0;

		// debugger;

		for (let i = 0; i < newLen; i++) {
			const newNode = n2[i];
			for (let j = 0; j < oldLen; j++) {
				const oldNode = n1[j];
				if (oldNode.key === newNode.key) {
					patch(oldNode, newNode, el);
					// 如果找到的旧节点的索引小于最大的索引，则说明需要移动
					if (j < lastIndex) {
						// 获取新节点的上一个节点
						const prevNode = n2[i - 1];
						const anchor = prevNode.el!.nextSibling as HTMLElement;
						if (prevNode) {
							insert(oldNode.el!, el, anchor);
						}
					} else {
						lastIndex = j;
					}
					break;
				}
			}
		}

		// const len = Math.min(oldLen, newLen);

		// for (let i = 0; i < len; i++) {
		// 	patch(n1[i], n2[i], el);
		// }

		// 如果旧节点比新节点多，则卸载多余的节点
		// if (oldLen > newLen) {
		// 	for (let i = len; i < oldLen; i++) {
		// 		unmount(n1[i]);
		// 	}
		// 	// 如果新节点比旧节点多，则添加多余的节点
		// } else if (newLen > oldLen) {
		// 	for (let i = len; i < newLen; i++) {
		// 		patch(null, n2[i], el);
		// 	}
		// }
	}

	return { render };
}

export function ensureRenderer() {
	return createRenderer(opts);
}
