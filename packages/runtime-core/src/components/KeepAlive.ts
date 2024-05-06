import { isArray, isObject, isRegExp, isString } from "@mini-vue/shared";
import { defineComponent } from "../apiDefineComponent";
import { getCurrentInstance } from "../component";
import type { VNode } from "../vnode";

type MatchPattern = string | RegExp | (string | RegExp)[];

export interface KeepAliveProps {
	include?: MatchPattern;
	exclude?: MatchPattern;
	max?: number | string;
}

type CacheKey = string | number | symbol | object;
type Cache = Map<CacheKey, VNode>;
type Keys = Set<CacheKey>;

export const KeepAlive = defineComponent({
	_isKeepAlive: true,
	props: {
		include: [String, RegExp, Array],
		exclude: [String, RegExp, Array],
		max: [String, Number]
	},
	setup(props, { slots }) {
		const cacheMap: Cache = new Map();
		const keys: Keys = new Set();

		const instance = getCurrentInstance();

		const { move, createElement, unmount } = instance.keepAliveCtx;

		const storageContainer = createElement("div");

		instance._deactivate = (vnode: VNode) => {
			move(vnode, storageContainer, 0);
		};
		instance._activate = (vnode: VNode, container: HTMLElement, anchor: HTMLElement) => {
			move(vnode, container, anchor);
		};

		const pruneCacheEntry = (key: CacheKey) => {
			const cached = cacheMap.get(key) as VNode;
			unmount(cached);
			cacheMap.delete(key);
			keys.delete(key);
		};

		return () => {
			let rawVNode = slots.default();
			const comp = (rawVNode as any).type;

			// 如果不是组件直接返回
			if (!isObject(comp)) return rawVNode;

			const name = (comp as any).name ?? comp;
			const { include, exclude, max } = props;

			if (
				(exclude && name && matches(exclude, name)) ||
				(include && (!name || !matches(include, name)))
			)
				return rawVNode;

			const key: CacheKey = rawVNode.key == null ? comp : rawVNode.key;
			const cachedVNode = cacheMap.get(key);

			if (cachedVNode) {
				// 避免组件重新挂载
				rawVNode.keptAlive = true;
				// 继承组件的实例
				rawVNode.component = cachedVNode.component;
			} else {
				keys.add(key);
				cacheMap.set(key, rawVNode);
				if (max && keys.size > parseInt(max as string, 10)) {
					pruneCacheEntry(keys.values().next().value);
				}
			}

			// 保存keep-alive实例
			rawVNode.keepAliveInstance = instance;
			// 标记为true,避免组件被卸载
			rawVNode.shouldKeepAlive = true;

			return rawVNode;
		};
	}
});

function matches(pattern: MatchPattern, name: string): boolean {
	if (isArray(pattern)) {
		return pattern.some((p) => matches(p, name));
	} else if (isString(pattern)) {
		return pattern.split(",").includes(name);
	} else if (isRegExp(pattern)) {
		return pattern.test(name);
	}
	return false;
}
