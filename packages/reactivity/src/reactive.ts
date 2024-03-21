import { def, isObject, toRawType } from "@vue/shared";
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

export interface Target {
	[ReactiveFlags.SKIP]?: boolean;
	[ReactiveFlags.IS_REACTIVE]?: boolean;
	[ReactiveFlags.IS_READONLY]?: boolean;
	[ReactiveFlags.IS_SHALLOW]?: boolean;
	[ReactiveFlags.RAW]?: any;
}

enum TargetType {
	INVALID = 0,
	COMMON = 1,
	COLLECTION = 2
}

function targetTypeMap(rawType: string) {
	switch (rawType) {
		case "Object":
		case "Array":
			return TargetType.COMMON;
		case "Map":
		case "Set":
		case "WeakMap":
		case "WeakSet":
			return TargetType.COLLECTION;
		default:
			return TargetType.INVALID;
	}
}

/**
 * 如果对象有SKIP属性或者不可扩展，则标记对象为不可响应
 * @param value
 * @returns
 */
function getTargetType(value: Target) {
	return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
		? TargetType.INVALID
		: targetTypeMap(toRawType(value));
}

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

	const targetType = getTargetType(target);

	// 判断对象类型
	if (targetType === TargetType.INVALID) {
		return target;
	}

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

export function toRaw<T>(observed: any): T {
	const raw = observed && observed[ReactiveFlags.RAW];
	return raw ? toRaw(raw) : observed;
}

export declare const RawSymbol: unique symbol;
export type Raw<T> = T & { [RawSymbol]?: true };
export function markRaw<T extends object>(value: T): Raw<T> {
	if (Object.isExtensible(value)) {
		def(value, ReactiveFlags.SKIP, true);
	}
	return value;
}
