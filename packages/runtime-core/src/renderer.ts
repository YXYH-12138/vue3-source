import { effect, reactive, shallowReactive, shallowReadonly } from "@mini-vue/reactivity";
import { hasOwn, isArray, isFunction, isObject, isOn, isString } from "@mini-vue/shared";
import schedule from "./schedule";
import { setCurrentInstance } from "./component";
import { type VNode, Text as TextType, Fragment, isSameVNodeType } from "./vnode";
import { isTeleport } from "./components/Teleport";
import { type CreateAppFunction, createAppAPI } from "./apiCreateApp";

export interface Renderer<HostElement = RendererElement> {
	render: RootRenderFunction<HostElement>;
	createApp: CreateAppFunction<HostElement>;
}

export interface RendererNode {
	[key: string]: any;
}
export interface RendererElement extends RendererNode {}

export interface RendererOptions<HostElement = RendererElement> {
	createElement: (tag: string) => HostElement;
	patchProp: (el: HostElement, key: string, prevValue: any, nextValue: any) => void;
	insert: (el: HostElement | Text, parent: HostElement, anchor?: HostElement) => void;
	remove: (el: HostElement) => void;
	createText: (text?: string) => Text;
	setText: (el: Text, text: string) => void;
	setElementText: (el: HostElement, text: string) => void;
}

export type RootRenderFunction<HostElement = RendererElement> = (
	vnode: VNode | null,
	container: HostElement
) => void;

function baseCreateRenderer<HostElement = RendererElement>({
	setElementText,
	createElement,
	createText,
	setText,
	remove,
	insert,
	patchProp
}: RendererOptions<HostElement>): Renderer<HostElement> {
	const render: RootRenderFunction = (vNode, container) => {
		if (vNode) {
			// 如果有新的vnode，则patch
			patch(container._vnode, vNode, container as HostElement);
		} else if (container._vnode) {
			// 如果没有新的vnode而且有旧的vnode，则删除
			unmount(container._vnode);
		}
		container._vnode = vNode;
	};

	const excuteHooks = (hooks?: Array<(this: any) => void>, context?: any) => {
		hooks && hooks.forEach((fn) => fn.call(context));
	};

	// 卸载
	function unmount(vnode: VNode) {
		const comp = vnode.type as any;
		if (isObject(comp) || isFunction(comp)) {
			if (vnode.shouldKeepAlive) {
				vnode.keepAliveInstance._deactivate(vnode);
			} else if (isTeleport(comp)) {
				(vnode.children as VNode[]).forEach((v) => unmount(v));
			} else {
				unmount(vnode.component.subTree);
				excuteHooks(vnode.component.unMounted);
			}
		} else if (comp === Fragment) {
			(vnode.children as VNode[]).forEach((v) => unmount(v));
		} else {
			remove(vnode.el as HostElement);
		}
	}

	/** 对新节点和旧节点进行比较patch */
	function patch(n1: VNode | undefined, n2: VNode, container: HostElement, anchor?: HostElement) {
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
				patchChildren(n1, n2, container as HostElement);
			}
			// 处理文本节点
		} else if (n2.type === TextType) {
			if (!n1) {
				const el = (n2.el = createText(n2.children as string));
				insert(el, container as HostElement, anchor as HostElement);
			} else {
				const el = (n2.el = n1.el);
				if (n1.children !== n2.children) {
					setText(el as Text, n2.children as string);
				}
			}
		} else if (isObject(n2.type) && isTeleport(n2.type)) {
			// 处理Teleport组件
			(n2.type as any).process(n1, n2, container, anchor, {
				patch,
				patchChildren,
				unmount,
				insert
			});
		} else if (isObject(n2.type) || isFunction(n2.type)) {
			// 普通和函数式组件
			if (!n1) {
				if (n2.keptAlive) {
					n2.keepAliveInstance._activate(n2, container, anchor);
				} else {
					mountComponent(n2, container, anchor);
				}
			} else {
				patchComponent(n1, n2, anchor);
			}
		}
	}

	/** 比较子节点 */
	function patchChildren(
		n1: VNode | undefined,
		n2: VNode,
		el: HostElement,
		parentAnchor?: HostElement
	) {
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
				fastDiff(oldChildren, newChildren, el, parentAnchor);
				// simpleDiff(oldChildren, newChildren, el);
				// patchKeyedChildren(oldChildren, newChildren, el);
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
	function patchElement(n1: VNode | undefined, n2: VNode, container: HostElement) {
		const el = (n2.el = n1.el);
		const oldProps = n1.props;
		const newProps = n2.props;
		// 添加新的props
		for (const key in newProps) {
			if (oldProps[key] !== newProps[key]) {
				patchProp(el as HostElement, key, oldProps[key], newProps[key]);
			}
		}
		// 删除旧的props
		for (const key in oldProps) {
			if (!hasOwn(newProps, key)) {
				patchProp(el as HostElement, key, oldProps[key], null);
			}
		}

		patchChildren(n1, n2, el as HostElement);
	}

	/** 挂载元素 */
	function mountElement(vnode: VNode, container: HostElement, anchor?: HostElement) {
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

	const internals = { move, createElement, unmount, insert };
	function move(vnode: VNode, container: HostElement, anchor?: HostElement) {
		const comp = vnode.type as any;
		if (isFunction(comp?.move)) {
			comp.move(vnode, container, anchor, internals);
		} else {
			insert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor);
		}
	}

	/** 挂载组件 */
	function mountComponent(vnode: VNode, container: HostElement, anchor?: HostElement) {
		let componentOption: any = vnode.type;

		// 如果是函数式组件
		if (isFunction(componentOption)) {
			componentOption = { render: componentOption, props: componentOption.props };
		}

		let { data, render, props: propsOption, setup } = componentOption;

		// beforeCreate hook

		const state = data ? reactive(isFunction(data) ? data() : data) : undefined;
		// 解析props数据
		const [props, attrs] = resolveProps(propsOption, vnode.props);

		const slots = vnode.children ?? {};

		const instance: any = {
			state,
			props: shallowReactive(props),
			isMounted: false,
			subTree: null,
			attrs,
			slots,
			mounted: [],
			unMounted: [],
			ctx: internals
		};
		vnode.component = instance;

		// created hook

		// 事件emit
		const emit = function (event: string, ...payload: any[]) {
			const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
			const handler = props[eventName];
			handler && handler(...payload);
		};

		// 处理setup
		let setupState: any = null;
		const setupContext = { attrs, slots, emit };
		// 设置instance，用于注册生命周期
		setCurrentInstance(instance);
		// 执行setup函数
		const setupResult = setup ? setup(shallowReadonly(instance.props), setupContext) : null;
		setCurrentInstance(null);
		if (isFunction(setupResult)) {
			if (render) console.warn("setup return render function the render option will be ignored");
			render = setupResult;
		} else {
			setupState = setupResult;
		}

		// 代理创建一个render函数的上下文
		const renderContext = new Proxy(instance, {
			get(target, p) {
				const { state, props } = target;
				if (state && p in state) {
					return state[p];
				} else if (props && p in props) {
					return props[p];
				} else if (setupState && p in setupState) {
					return setupState[p];
				} else {
					console.warn(`not exist`);
				}
			},
			set(target, p, newValue) {
				const { state, props } = target;
				if (state && p in state) {
					state[p] = newValue;
				} else if (setupState && p in setupState) {
					setupState[p] = newValue;
				} else if (props && p in props) {
					console.warn(`Attempting to mutate prop "${p.toString()}". Props are readonly.`);
					return false;
				} else {
					console.warn(`not exist`);
					return false;
				}
				return true;
			}
		});

		effect(
			() => {
				const subTree = render.call(renderContext, instance.props);
				// 检查是否挂载
				if (!instance.isMounted) {
					patch(null, subTree, container, anchor);
					excuteHooks(instance.mounted, renderContext);
					instance.isMounted = true;
				} else {
					patch(instance.subTree, subTree, container, anchor);
				}
				instance.subTree = subTree;
			},
			{ schedule }
		);
	}

	/** 更新组件 */
	function patchComponent(n1: VNode, n2: VNode, anchor: HostElement) {
		const instance = (n2.component = n1.component);
		const { props } = instance;
		// 判断为子组件传递的props是否改变
		if (hasPropsChanged(n1.props, n2.props)) {
			const [nextProps] = resolveProps((n2.type as any).props, n2.props);
			// 更新props
			for (let key in nextProps) {
				props[key] = nextProps[key];
			}
			// 删除不存在的props
			for (let key in props) {
				if (!(key in nextProps)) {
					delete props[key];
				}
			}
		}
	}

	/**
	 * 简单diff算法
	 * 核心原理：遍历新节点，内部遍历旧节点，如果有相同的key，则去判断lastIndex和找到的索引的大小
	 *  如果找到的旧节点的索引小于lastIndex，则说明需要移动
	 *  否则更新lastIndex为当前遍历到底旧节点索引
	 */
	// function simpleDiff(oldChildren: VNode[], newChildren: VNode[], container: RendererElement) {
	// 	const oldLen = oldChildren.length;
	// 	const newLen = newChildren.length;

	// 	// 记录最大的索引值
	// 	let lastIndex = 0;

	// 	for (let i = 0; i < newLen; i++) {
	// 		// 记录是否找到了旧节点
	// 		let find = false;
	// 		const newNode = newChildren[i];
	// 		for (let j = 0; j < oldLen; j++) {
	// 			const oldNode = oldChildren[j];
	// 			if (oldNode.key === newNode.key) {
	// 				find = true;
	// 				patch(oldNode, newNode, container);
	// 				// 如果找到的旧节点的索引小于最大的索引，则说明需要移动
	// 				if (j < lastIndex) {
	// 					// 获取新节点的上一个节点
	// 					const prevNode = newChildren[i - 1];
	// 					if (prevNode) {
	// 						// 以上一个节点的下一个兄弟节点作为锚点
	// 						const anchor = prevNode.el!.nextSibling as HTMLElement;
	// 						insert(oldNode.el!, container, anchor);
	// 					}
	// 				} else {
	// 					lastIndex = j;
	// 				}
	// 				break;
	// 			}
	// 		}
	// 		// 判断是否添加新节点
	// 		if (!find) {
	// 			// 获取新节点的上一个节点
	// 			const prevNode = newChildren[i - 1];
	// 			// 如果有prevNode以上一个节点的下一个兄弟节点作为锚点，
	// 			// 没有代表需要将元素插入到开始，需要使用container.firstChild作为锚点，不然会将节点插入到已有节点的后面
	// 			const anchor = prevNode ? prevNode.el.nextSibling : container.firstChild;
	// 			patch(null, newNode, container, anchor as HTMLElement);
	// 		}
	// 		// 删除旧节点
	// 		for (let j = 0; j < oldLen; j++) {
	// 			const oldVNode = oldChildren[j];
	// 			const has = newChildren.find((v) => v.key === oldVNode.key);
	// 			// 如果没有则代表需要删除
	// 			if (!has) {
	// 				unmount(oldVNode);
	// 			}
	// 		}
	// 	}
	// }

	/**
	 * 双端diff算法
	 *  对比简单diff,执行的DOM移动操作次数更少
	 */
	// function patchKeyedChildren(
	// 	oldChildren: VNode[],
	// 	newChildren: VNode[],
	// 	container: RendererElement
	// ) {
	// 	// 新旧节点开始结束的索引
	// 	let newStartIndex = 0;
	// 	let newEndIndex = newChildren.length - 1;
	// 	let oldStartIndex = 0;
	// 	let oldEndIndex = oldChildren.length - 1;

	// 	let newStartVNode = newChildren[newStartIndex];
	// 	let newEndVNode = newChildren[newEndIndex];
	// 	let oldStartVNode = oldChildren[oldStartIndex];
	// 	let oldEndVNode = oldChildren[oldEndIndex];

	// 	// 循环进行双端比较
	// 	while (newStartIndex <= newEndIndex && oldStartIndex <= oldEndIndex) {
	// 		// 如果没有新旧节点，则代表被处理过
	// 		if (!oldStartVNode) {
	// 			oldStartVNode = oldChildren[++oldStartIndex];
	// 		} else if (!oldEndVNode) {
	// 			oldEndVNode = oldChildren[--oldEndIndex];
	// 		} else if (oldStartVNode.key === newStartVNode.key) {
	// 			/** 旧头节点与新头节点key相同 */
	// 			patch(oldStartVNode, newStartVNode, container);
	// 			oldStartVNode = oldChildren[++oldStartIndex];
	// 			newStartVNode = newChildren[++newStartIndex];
	// 		} else if (oldEndVNode.key === newEndVNode.key) {
	// 			/** 旧尾节点与新尾节点key相同 */
	// 			patch(oldEndVNode, newEndVNode, container);
	// 			oldEndVNode = oldChildren[--oldEndIndex];
	// 			newEndVNode = newChildren[--newEndIndex];
	// 		} else if (oldStartVNode.key === newEndVNode.key) {
	// 			/** 旧头节点与新尾节点key相同 */
	// 			patch(oldStartVNode, newEndVNode, container);
	// 			// 将oldStartVNode移动到oldEndVNode的后面
	// 			insert(oldStartVNode.el!, container, oldEndVNode.el.nextSibling as HTMLElement);
	// 			oldStartVNode = oldChildren[++oldStartIndex];
	// 			newEndVNode = newChildren[--newEndIndex];
	// 		} else if (oldEndVNode.key === newStartVNode.key) {
	// 			/** 旧尾节点与新头节点key相同 */
	// 			patch(oldEndVNode, newStartVNode, container);
	// 			// 将oldEndVNode移动到oldStartVNode的前面
	// 			insert(oldEndVNode.el!, container, oldStartVNode.el as HTMLElement);
	// 			oldEndVNode = oldChildren[--oldEndIndex];
	// 			newStartVNode = newChildren[++newStartIndex];
	// 		} else {
	// 			/** 非理想情况，头尾都没找到 */

	// 			// 查找新头节点在旧节点中的索引
	// 			const indexInOld = oldChildren.findIndex((vnode) => vnode.key === newStartVNode.key);
	// 			if (indexInOld !== -1) {
	// 				const vnodeToMove = oldChildren[indexInOld];
	// 				patch(vnodeToMove, newStartVNode, container);
	// 				insert(vnodeToMove.el!, container, oldStartVNode.el as HTMLElement);
	// 				oldChildren[indexInOld] = undefined;
	// 			} else {
	// 				patch(null, newStartVNode, container, oldStartVNode.el as HTMLElement);
	// 			}
	// 			newStartVNode = newChildren[++newStartIndex];
	// 		}
	// 	}

	// 	// 新子元素中未处理的节点需要逐一挂载
	// 	if (newStartIndex <= newEndIndex && oldEndIndex < newStartIndex) {
	// 		for (let i = newStartIndex; i <= newEndIndex; i++) {
	// 			patch(null, newChildren[i], container, oldStartVNode.el as HTMLElement);
	// 		}
	// 		/** 处理删除节点的情况 */
	// 	} else if (oldStartIndex <= oldEndIndex && newEndIndex < newStartIndex) {
	// 		for (let i = oldStartIndex; i <= oldEndIndex; i++) {
	// 			unmount(oldChildren[i]);
	// 		}
	// 	}
	// }

	/**
	 * 快速 Diff 算法在实测中性能最优。它借鉴了文本 Diff 中的预处理思路，
	 * 先处理新旧两组子节点中相同的前置节点和相同的后置节点。
	 * 当前置节点和后置节点全部处理完毕后，如果无法简单地通过挂载新节点或者卸载已经不存在的节点来完成更新，
	 * 则需要根据节点的索引关系，构造出一个最长递增子序列。
	 * 最长递增子序列所指向的节点即为不需要移动的节点。
	 */
	function fastDiff(
		oldChildren: VNode[],
		newChildren: VNode[],
		container: HostElement,
		parentAnchor?: HostElement
	) {
		// 处理相同的前置节点
		let startIndex = 0;

		const l2 = newChildren.length;

		let oldEndIndex = oldChildren.length - 1;
		let newEndIndex = l2 - 1;

		// 1.处理相同的前置节点
		// (a b) c
		// (a b) d e
		while (startIndex <= oldEndIndex && startIndex <= newEndIndex) {
			const n1 = oldChildren[startIndex];
			const n2 = newChildren[startIndex];
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, container);
			} else {
				break;
			}
			startIndex++;
		}

		// 2.处理相同的后置节点
		// a (b c)
		// d e (b c)
		while (startIndex <= oldEndIndex && startIndex <= newEndIndex) {
			const n1 = oldChildren[startIndex];
			const n2 = newChildren[startIndex];
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, container);
			} else {
				break;
			}
			newEndIndex--;
			oldEndIndex--;
		}

		// 3.处理新增的情况
		// (a b)
		// (a b) c
		// startIndex = 2, oldEndIndex = 1, newEndIndex = 2
		// startIndex = 0, oldEndIndex = -1, newEndIndex = 0
		if (startIndex > oldEndIndex) {
			if (startIndex <= newEndIndex) {
				// 后置元素已经处理完，那么newEndIndex+1就是新元素的锚点
				const nextPos = newEndIndex + 1;
				const anchor = nextPos < l2 ? newChildren[nextPos].el : parentAnchor;
				while (startIndex <= newEndIndex) {
					patch(null, newChildren[startIndex++], container, anchor as HostElement);
				}
			}
		}
		// 4.处理删除的情况
		// (a b) c
		// (a b)
		// startIndex = 2, oldEndIndex = 2, newEndIndex = 1
		// a (b c)
		// (b c)
		// startIndex = 0, oldEndIndex = 0, newEndIndex = -1
		else if (startIndex > newEndIndex) {
			while (startIndex <= oldEndIndex) {
				unmount(oldChildren[startIndex++]);
			}
		}
		// 5.非理想情况
		else {
			// 标志节点是否需要移动
			let moved = false;
			let pos = 0;

			// 表示已经更新过的节点数量
			let patched = 0;

			// 建立新节点key与索引之间的映射
			const keyIndex: Record<string, number> = {};
			for (let i = startIndex; i <= newEndIndex; i++) {
				const nextChild = newChildren[i];
				if (nextChild.key) {
					keyIndex[nextChild.key] = i;
				}
			}

			// 新节点长度
			const toBePatched = newEndIndex - startIndex + 1;
			// 新的一组子节点中的节点在旧的一组子节点中的位置索引
			const source = new Array(toBePatched).fill(-1);
			// 遍历旧节点中未处理的节点
			for (let i = startIndex; i <= oldEndIndex; i++) {
				const prevChild = oldChildren[i];
				// 判断已经更新过的节点数量是否大于需要更新的节点数量
				if (patched >= toBePatched) {
					unmount(prevChild);
					continue;
				}
				const k = keyIndex[prevChild.key];
				if (k != undefined) {
					source[k - startIndex] = i;
					patch(prevChild, newChildren[k], container);
					patched++;
					// 在遍历过程中遇到的索引值呈现递增趋势，则说明不需要移动节点，反之则需要
					if (k >= pos) {
						pos = k;
					} else {
						moved = true;
					}
				} else {
					unmount(prevChild);
				}
			}

			// 求出最长递增的子序列
			const increasingNewIndexSequence = moved ? getSequence(source) : [];
			let j = increasingNewIndexSequence.length - 1;

			for (let i = toBePatched - 1; i >= 0; i--) {
				if (source[i] === -1) {
					const nextIndex = startIndex + i;
					const nextChild = newChildren[nextIndex];
					// 用最后节点作为锚点
					const anchor = nextIndex + 1 < l2 ? newChildren[nextIndex + 1].el : parentAnchor;
					patch(null, nextChild, container, anchor as HostElement);
				} else if (moved) {
					if (i !== increasingNewIndexSequence[j]) {
						const pos = i + startIndex;
						const nextPos = pos + 1;
						const anchor = nextPos < l2 ? newChildren[nextPos].el : null;
						insert(newChildren[pos].el as HostElement, container, anchor as HostElement);
					} else {
						// 节点不需要移动
						j--;
					}
				}
			}
		}
	}

	return { render, createApp: createAppAPI(render) };
}

/** props是否有变化 */
function hasPropsChanged(oldProps: any, newProps: any) {
	const keys = Object.keys(newProps);
	if (keys.length !== Object.keys(oldProps).length) return true;

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (newProps[key] !== oldProps[key]) {
			return true;
		}
	}

	return false;
}

/** 根据子组件的props和父组件传递的props解析出props和attrs */
function resolveProps(
	options: Record<string, any> | undefined,
	propsData: Record<string, any> = {}
) {
	const props: Record<string, any> = {};
	const attrs: Record<string, any> = {};
	for (const key in propsData) {
		if (options && (key in options || isOn(key))) {
			props[key] = propsData[key];
		} else {
			attrs[key] = propsData[key];
		}
	}

	return [props, attrs];
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

export function createRenderer<HostElement = RendererElement>(
	options: RendererOptions<HostElement>
) {
	return baseCreateRenderer<HostElement>(options);
}
