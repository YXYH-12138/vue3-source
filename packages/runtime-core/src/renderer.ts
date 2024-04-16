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
	function patch(
		n1: VNode | undefined,
		n2: VNode,
		container: RendererElement,
		anchor?: HTMLElement
	) {
		//  如果新旧node类型不同，直接卸载即可
		if (n1 && n1.type !== n2.type) {
			unmount(n1);
			n1 = null;
		}

		// 处理文本节点
		if (isString(n2.type)) {
			if (!n1) {
				mountElement(n2, container, anchor);
			} else {
				// 更新元素
				patchElement(n1, n2, container);
			}
			// 处理片段
		} else if (n2.type === Fragment) {
			if (!n1 && isArray(n2.children)) {
				n2.children.forEach((v) => patch(undefined, v, container, anchor));
			} else {
				patchChildren(n1, n2, container);
			}
			// 处理文本节点
		} else if (n2.type === TextType) {
			if (!n1) {
				const el = (n2.el = createText());
				insert(el, container, anchor);
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
	function mountElement(vnode: VNode, container: RendererElement, anchor?: HTMLElement) {
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

		insert(el, container, anchor);
	}

	function diff(n1: VNode[], n2: VNode[], container: RendererElement) {
		const oldLen = n1.length;
		const newLen = n2.length;

		// 记录最大的索引值
		let lastIndex = 0;

		for (let i = 0; i < newLen; i++) {
			let find = false;
			// 记录是否找到了旧节点
			const newNode = n2[i];
			for (let j = 0; j < oldLen; j++) {
				const oldNode = n1[j];
				if (oldNode.key === newNode.key) {
					find = true;
					patch(oldNode, newNode, container);
					// 如果找到的旧节点的索引小于最大的索引，则说明需要移动
					if (j < lastIndex) {
						// 获取新节点的上一个节点
						const prevNode = n2[i - 1];
						if (prevNode) {
							// 以上一个节点的下一个兄弟节点作为锚点
							const anchor = prevNode.el!.nextSibling as HTMLElement;
							insert(oldNode.el!, container, anchor);
						}
					} else {
						lastIndex = j;
					}
					break;
				}
			}
			// 判断是否添加新节点
			if (!find) {
				// 获取新节点的上一个节点
				const prevNode = n2[i - 1];
				// 如果有prevNode以上一个节点的下一个兄弟节点作为锚点，
				// 没有代表需要将元素插入到开始，需要使用container.firstChild作为锚点，不然会将节点插入到已有节点的后面
				const anchor = prevNode ? prevNode.el.nextSibling : container.firstChild;
				patch(null, newNode, container, anchor as HTMLElement);
			}
			// 删除旧节点
			for (let j = 0; j < oldLen; j++) {
				const oldVNode = n1[j];
				const has = n2.find((v) => v.key === oldVNode.key);
				// 如果没有则代表需要删除
				if (!has) {
					unmount(oldVNode);
				}
			}
		}
	}

	return { render };
}

export function ensureRenderer() {
	return createRenderer(opts);
}
