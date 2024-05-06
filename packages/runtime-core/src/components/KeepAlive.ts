import { isObject } from "@mini-vue/shared";
import { defineComponent } from "../apiDefineComponent";
import { getCurrentInstance } from "../component";
import type { VNode } from "../vnode";

type MatchPattern = string | RegExp | (string | RegExp)[];

export interface KeepAliveProps {
	include?: MatchPattern;
	exclude?: MatchPattern;
	max?: number | string;
}

export const KeepAlive = defineComponent({
	_isKeepAlive: true,
	setup(props, { slots }) {
		const cacheMap = new Map();

		const instance = getCurrentInstance();

		const { move, createElement } = instance.keepAliveCtx;

		const storageContainer = createElement("div");

		instance._deactivate = (vnode: VNode) => {
			move(vnode, storageContainer, 0);
		};
		instance._activate = (vnode: VNode, container: HTMLElement, anchor: HTMLElement) => {
			move(vnode, container, anchor);
		};

		return () => {
			let rawVNode = slots.default();

			// 如果不是组件直接返回
			if (!isObject(rawVNode.type)) return rawVNode;

			const type = (rawVNode as any).type;

			// 获取缓存组件
			let cachedVNode = cacheMap.get(type);
			if (cachedVNode) {
				// 避免组件重新挂载
				rawVNode.keptAlive = true;
				// 继承组件的实例
				rawVNode.component = cachedVNode.component;
			} else {
				cacheMap.set(type, rawVNode);
			}

			// 保存keep-alive实例
			rawVNode.keepAliveInstance = instance;
			// 标记为true,避免组件被卸载
			rawVNode.shouldKeepAlive = true;

			return rawVNode;
		};
	}
});
