import { isObject } from "@vue/shared";
import {
	nomoralHandlers,
	readonlyHandlers,
	shallowHandlers,
	shallowReadonlyHandlers
} from "./baseHandlers";
import type { Ref } from "./ref";

export const enum ReactiveFlags {
	SKIP = "__v_skip",
	IS_REACTIVE = "__v_isReactive",
	IS_READONLY = "__v_isReadonly",
	IS_SHALLOW = "__v_isShallow",
	RAW = "__v_raw"
}

type BaseTypes = string | number | boolean;

type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Reactive<T extends object> = T;

export type UnwrapRefSimple<T> = T extends BaseTypes | Function
	? T
	: {
			[P in keyof T]: T[P] extends Ref<infer V> ? UnwrapRef<V> : T[P];
	  };

export type UnwrapRef<T> = T extends Ref<infer V> ? UnwrapRefSimple<V> : UnwrapRefSimple<T>;

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
	return createReactive<T>(target, false, false) as UnwrapNestedRefs<T>;
}

export function shallowReactive<T extends object>(target: T) {
	return createReactive<T>(target, true, false);
}

export function readonly<T extends object>(target: T) {
	return createReactive<T>(target, false, true) as DeepReadonly<T>;
}

export function shallowReadonly<T extends object>(target: T) {
	return createReactive<T>(target, true, true) as Readonly<T>;
}

export function toRaw(value: any) {
	// 如果 value 是 proxy 的话 ,那么直接返回就可以了
	// 因为会触发 createGetter 内的逻辑
	// 如果 value 是普通对象的话，
	// 我们就应该返回普通对象
	// 只要不是 proxy ，只要是得到了 undefined 的话，那么就一定是普通对象
	// TODO 这里和源码里面实现的不一样，不确定后面会不会有问题
	if (!value[ReactiveFlags.RAW]) {
		return value;
	}

	return value[ReactiveFlags.RAW];
}

const reactiveMap = new WeakMap();

function createReactive<T extends object>(target: T, isShallow: boolean, isReadonly: boolean): T {
	const handlers = isShallow
		? isReadonly
			? shallowReadonlyHandlers
			: shallowHandlers
		: isReadonly
		? readonlyHandlers
		: nomoralHandlers;

	// 已经代理过的对象不需要代理
	const existionProxy = reactiveMap.get(target);
	if (existionProxy) return existionProxy;

	const proxy = new Proxy<T>(target, handlers);
	// 缓存代理过的对象
	reactiveMap.set(target, proxy);

	return proxy;
}

/**
 * 转换为响应式对象
 * @param value
 */
export const toReactive = <T extends unknown>(value: T): T =>
	isObject(value) ? reactive(value) : value;
