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
				// simpleDiff(oldChildren, newChildren, el);
				// patchKeyedChildren(oldChildren, newChildren, el);
				fastDiff(oldChildren, newChildren, el);
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

	/**
	 * 简单diff算法
	 * 核心原理：遍历新节点，内部遍历旧节点，如果有相同的key，则去判断lastIndex和找到的索引的大小
	 *  如果找到的旧节点的索引小于lastIndex，则说明需要移动
	 *  否则更新lastIndex为当前遍历到底旧节点索引
	 */
	function s9impleDiff(oldChildren: VNode[], newChildren: VNode[], container: RendererElement) {
		const oldLen = oldChildren.length;
		const newLen = newChildren.length;

		// 记录最大的索引值
		let lastIndex = 0;

		for (let i = 0; i < newLen; i++) {
			// 记录是否找到了旧节点
			let find = false;
			const newNode = newChildren[i];
			for (let j = 0; j < oldLen; j++) {
				const oldNode = oldChildren[j];
				if (oldNode.key === newNode.key) {
					find = true;
					patch(oldNode, newNode, container);
					// 如果找到的旧节点的索引小于最大的索引，则说明需要移动
					if (j < lastIndex) {
						// 获取新节点的上一个节点
						const prevNode = newChildren[i - 1];
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
				const prevNode = newChildren[i - 1];
				// 如果有prevNode以上一个节点的下一个兄弟节点作为锚点，
				// 没有代表需要将元素插入到开始，需要使用container.firstChild作为锚点，不然会将节点插入到已有节点的后面
				const anchor = prevNode ? prevNode.el.nextSibling : container.firstChild;
				patch(null, newNode, container, anchor as HTMLElement);
			}
			// 删除旧节点
			for (let j = 0; j < oldLen; j++) {
				const oldVNode = oldChildren[j];
				const has = newChildren.find((v) => v.key === oldVNode.key);
				// 如果没有则代表需要删除
				if (!has) {
					unmount(oldVNode);
				}
			}
		}
	}

	/**
	 * 双端diff算法
	 *  对比简单diff,执行的DOM移动操作次数更少
	 */
	function patchKeyedChildren(
		oldChildren: VNode[],
		newChildren: VNode[],
		container: RendererElement
	) {
		// 新旧节点开始结束的索引
		let newStartIndex = 0;
		let newEndIndex = newChildren.length - 1;
		let oldStartIndex = 0;
		let oldEndIndex = oldChildren.length - 1;

		let newStartVNode = newChildren[newStartIndex];
		let newEndVNode = newChildren[newEndIndex];
		let oldStartVNode = oldChildren[oldStartIndex];
		let oldEndVNode = oldChildren[oldEndIndex];

		// 循环进行双端比较
		while (newStartIndex <= newEndIndex && oldStartIndex <= oldEndIndex) {
			// 如果没有新旧节点，则代表被处理过
			if (!oldStartVNode) {
				oldStartVNode = oldChildren[++oldStartIndex];
			} else if (!oldEndVNode) {
				oldEndVNode = oldChildren[--oldEndIndex];
			} else if (oldStartVNode.key === newStartVNode.key) {
				/** 旧头节点与新头节点key相同 */
				patch(oldStartVNode, newStartVNode, container);
				oldStartVNode = oldChildren[++oldStartIndex];
				newStartVNode = newChildren[++newStartIndex];
			} else if (oldEndVNode.key === newEndVNode.key) {
				/** 旧尾节点与新尾节点key相同 */
				patch(oldEndVNode, newEndVNode, container);
				oldEndVNode = oldChildren[--oldEndIndex];
				newEndVNode = newChildren[--newEndIndex];
			} else if (oldStartVNode.key === newEndVNode.key) {
				/** 旧头节点与新尾节点key相同 */
				patch(oldStartVNode, newEndVNode, container);
				// 将oldStartVNode移动到oldEndVNode的后面
				insert(oldStartVNode.el!, container, oldEndVNode.el.nextSibling as HTMLElement);
				oldStartVNode = oldChildren[++oldStartIndex];
				newEndVNode = newChildren[--newEndIndex];
			} else if (oldEndVNode.key === newStartVNode.key) {
				/** 旧尾节点与新头节点key相同 */
				patch(oldEndVNode, newStartVNode, container);
				// 将oldEndVNode移动到oldStartVNode的前面
				insert(oldEndVNode.el!, container, oldStartVNode.el as HTMLElement);
				oldEndVNode = oldChildren[--oldEndIndex];
				newStartVNode = newChildren[++newStartIndex];
			} else {
				/** 非理想情况，头尾都没找到 */

				// 查找新头节点在旧节点中的索引
				const indexInOld = oldChildren.findIndex((vnode) => vnode.key === newStartVNode.key);
				if (indexInOld !== -1) {
					const vnodeToMove = oldChildren[indexInOld];
					patch(vnodeToMove, newStartVNode, container);
					insert(vnodeToMove.el!, container, oldStartVNode.el as HTMLElement);
					oldChildren[indexInOld] = undefined;
				} else {
					patch(null, newStartVNode, container, oldStartVNode.el as HTMLElement);
				}
				newStartVNode = newChildren[++newStartIndex];
			}
		}

		// 新子元素中未处理的节点需要逐一挂载
		if (newStartIndex <= newEndIndex && oldEndIndex < newStartIndex) {
			for (let i = newStartIndex; i <= newEndIndex; i++) {
				patch(null, newChildren[i], container, oldStartVNode.el as HTMLElement);
			}
			/** 处理删除节点的情况 */
		} else if (oldStartIndex <= oldEndIndex && newEndIndex < newStartIndex) {
			for (let i = oldStartIndex; i <= oldEndIndex; i++) {
				unmount(oldChildren[i]);
			}
		}
	}

	/**
	 * 快速diff算法，性能比双端diff算法更高
	 */
	function fastDiff(oldChildren: VNode[], newChildren: VNode[], container: RendererElement) {
		// 处理相同的前置节点
		let startIndex = 0;
		let newVNode = newChildren[startIndex];
		let oldVNode = oldChildren[startIndex];
		while (newVNode && oldVNode && newVNode.key === oldVNode.key) {
			patch(oldVNode, newVNode, container);
			startIndex++;
			newVNode = newChildren[startIndex];
			oldVNode = oldChildren[startIndex];
		}
		// 处理相同的后置节点
		let oldEndIndex = oldChildren.length - 1;
		let newEndIndex = newChildren.length - 1;
		newVNode = newChildren[newEndIndex];
		oldVNode = oldChildren[oldEndIndex];
		while (newVNode && oldVNode && newVNode.key === oldVNode.key) {
			patch(oldVNode, newVNode, container);
			newVNode = newChildren[--newEndIndex];
			oldVNode = oldChildren[--oldEndIndex];
		}

		// 处理新增的情况
		if (startIndex > oldEndIndex && startIndex <= newEndIndex) {
			// 后置元素已经处理完，那么newEndIndex+1就是新元素的锚点
			const anchorIndex = newEndIndex + 1;
			const anchor = anchorIndex <= newChildren.length ? newChildren[anchorIndex].el : null;
			while (startIndex <= newEndIndex) {
				patch(null, newChildren[startIndex++], container, anchor as HTMLElement);
			}
		}
		// 处理删除的情况
		else if (startIndex > newEndIndex && startIndex <= oldEndIndex) {
			while (startIndex <= oldEndIndex) {
				unmount(oldChildren[startIndex++]);
			}
		}
		// 非理想情况
		else {
			// 新节点长度
			const count = newEndIndex - startIndex + 1;
			// 新的一组子节点中的节点在旧的一组子节点中的位置索引
			const source = new Array(count).fill(-1);

			// 标志节点是否需要移动
			let moved = false;
			let pos = 0;

			// 表示已经更新过的节点数量
			let patched = 0;
			// 建立新节点key与索引之间的映射
			const keyIndex: Record<string, number> = {};
			for (let i = startIndex; i <= newEndIndex; i++) {
				const newVNode = newChildren[i];
				if (newVNode.key) {
					keyIndex[newVNode.key] = i;
				}
			}
			// 遍历旧节点中未处理的节点
			for (let i = startIndex; i <= oldEndIndex; i++) {
				oldVNode = oldChildren[i];
				// 判断已经更新过的节点数量是否大于需要更新的节点数量
				if (patched <= count) {
					const k = keyIndex[oldVNode.key];
					if (k != undefined) {
						newVNode = newChildren[k];
						patch(oldVNode, newVNode, container);
						source[k - startIndex] = i;
						patched++;
						// 在遍历过程中遇到的索引值呈现递增趋势，则说明不需要移动节点，反之则需要
						if (k < pos) {
							moved = true;
						} else {
							pos = k;
						}
					} else {
						unmount(oldVNode);
					}
				} else {
					unmount(oldVNode);
				}
			}

			if (moved) {
				// 求出最长递增的子序列
				const seq = getSequence(source);

				let i = count - 1;
				let s = seq.length - 1;

				for (; i >= 0; i--) {
					// 如果没有则代表是一个新节点，需要挂载
					if (source[i] === -1) {
						const pos = i + startIndex;
						const nextPos = pos + 1;
						const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;

						patch(null, newChildren[pos], container, anchor as HTMLElement);
					} else if (i !== seq[s]) {
						const pos = i + startIndex;
						const nextPos = pos + 1;
						const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
						insert(newChildren[pos].el, container, anchor as HTMLElement);
					} else {
						// 节点不需要移动
						s--;
					}
				}
			}
		}
	}

	return { render };
}

/**
 * 获取最长递增子序列的索引
 */
function getSequence(arr: number[]) {
	const len = arr.length;
	// 用于存储每个元素在其对应的最长递增子序列中的前一个元素的下标。
	const p = arr.slice();

	const result = [0];

	let left, right, mid, j;

	for (let i = 0; i < len; i++) {
		j = result[result.length - 1];
		const arrI = arr[i];
		if (arr[j] < arrI) {
			// 实际上是前一个索引的值
			p[i] = j;
			// 存储在result最后一个索引的值
			result.push(i);
		} else {
			left = 0;
			right = result.length - 1;
			while (left < right) {
				mid = (left + right) >> 1;
				if (arr[result[mid]] < arrI) {
					left = mid + 1;
				} else {
					right = mid;
				}
			}
			if (arrI < arr[result[left]]) {
				if (left > 0) {
					p[i] = result[left - 1];
				}
				result[left] = i;
			}
		}
	}

	let u = result.length;
	let v = result[u - 1]; // 查找数组p 找到最终的索引
	while (u-- > 0) {
		result[u] = v;
		v = p[v];
	}

	return result;
}

export function ensureRenderer() {
	return createRenderer(opts);
}
