import { def, isObject, toRawType } from "@mini-vue/shared";
import {
	nomoralHandlers,
	readonlyHandlers,
	shallowHandlers,
	shallowReadonlyHandlers
} from "./baseHandlers";
import { ReactiveFlags } from "./constants";
import type { Ref, UnwrapRefSimple } from "./ref";

export declare const ShallowReactiveMarker: unique symbol;

export type ShallowReactive<T> = T & { [ShallowReactiveMarker]?: true };

export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Reactive<T extends object> = T;

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

// only unwrap nested ref
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;

export function reactive<T extends object>(target: T) {
	return createReactive(target, false, nomoralHandlers) as UnwrapNestedRefs<T>;
}

export function shallowReactive<T extends object>(target: T) {
	return createReactive(target, false, shallowHandlers);
}

export function readonly<T extends object>(target: T) {
	return createReactive(target, true, readonlyHandlers) as DeepReadonly<T>;
}

export function shallowReadonly<T extends object>(target: T) {
	return createReactive(target, true, shallowReadonlyHandlers) as Readonly<T>;
}

export const reactiveMap = new WeakMap();

function createReactive(target: Target, isReadonly: boolean, baseHandlers: ProxyHandler<any>) {
	if (!isObject(target)) return target;

	// 已经代理过的对象不需要代理了
	// 只读+响应式对象，需要进一步代理
	if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
		return target;
	}

	const targetType = getTargetType(target);
	// 判断对象类型
	if (targetType === TargetType.INVALID) {
		return target;
	}

	// 在缓存中查找，已经代理过的对象不需要代理
	const existionProxy = reactiveMap.get(target);
	if (existionProxy) return existionProxy;

	const proxy = new Proxy(target, baseHandlers);
	// 缓存代理过的对象
	reactiveMap.set(target, proxy);

	return proxy;
}

/**
 * 是否是只读对象
 * @param value
 */
export function isReadonly(value: unknown) {
	return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}

/**
 * 是否是浅响应式对象
 * @param value
 * @returns
 */
export function isShallow(value: unknown): boolean {
	return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}

/**
 * 是否是代理对象
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 * @param value
 */
export function isReactive(value: unknown) {
	if (isReadonly(value)) {
		return isReactive((value as Target)[ReactiveFlags.RAW]);
	}
	return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE]);
}

/**
 * 是否是响应式对象
 * @param value
 * @returns
 */
export function isProxy(value: unknown) {
	return isReactive(value) || isReadonly(value);
}

/**
 * 转换为响应式对象
 * @param value
 */
export const toReactive = <T extends unknown>(value: T): T =>
	isObject(value) ? reactive(value as any) : value;

/**
 * 转换为原始对象
 * @param observed
 * @returns
 */
export function toRaw<T>(observed: any): T {
	const raw = observed && observed[ReactiveFlags.RAW];
	return raw ? toRaw(raw) : observed;
}

export declare const RawSymbol: unique symbol;
export type Raw<T> = T & { [RawSymbol]?: true };
/**
 * 标记为不可响应
 * @param value
 * @returns
 */
export function markRaw<T extends object>(value: T): Raw<T> {
	def(value, ReactiveFlags.SKIP, true);
	return value;
}
