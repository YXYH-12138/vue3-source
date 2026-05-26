import { hasChanged, isObject } from "@mini-vue/shared";
import { isProxy, isReactive, ShallowReactiveMarker, toReactive } from "./reactive";
import { type Dep, activeEffect, createDepMap, trackEffect, triggerEffects } from "./effect";

declare const RefSymbol: unique symbol;
declare const ShallowRefMarker: unique symbol;
export declare const RawSymbol: unique symbol;

export interface Ref<T = any> {
	value: T;
	[RefSymbol]: true;
}

type ToRefs<T = any> = {
	[K in keyof T]: Ref<T[K]>;
};

export function ref<T>(target: T) {
	return createRef<T>(target, false);
}

export function shallowRef<T>(target?: T) {
	return createRef<T>(target, true);
}

function createRef<T>(rawValue: T, shallow: boolean) {
	if (isRef(rawValue)) {
		return rawValue;
	}
	return new RefImpl<T>(rawValue, shallow);
}

class RefImpl<T> {
	readonly __v_isRef = true;

	dep: Dep;

	private _value: T;

	constructor(
		value: T,
		readonly __v_isShallow: boolean
	) {
		this._value = __v_isShallow ? value : toReactive(value);
	}

	get value() {
		trackRefValue(this);
		return this._value;
	}

	set value(newValue) {
		if (hasChanged(this._value, newValue)) {
			this._value = this.__v_isShallow ? newValue : toReactive(newValue);
			triggerRefValue(this);
		}
	}
}

type RefBase<T> = {
	dep?: Dep;
	value: T;
};

/**
 * 收集ref的依赖
 * @param ref
 * @returns
 */
export function trackRefValue(ref: RefBase<any>) {
	if (!activeEffect) return;
	// 如果没有dep，则需要创建一个dep
	if (!ref.dep) {
		ref.dep = createDepMap(() => {
			ref.dep = undefined;
		});
	}
	trackEffect(activeEffect, ref.dep);
}
/**
 * 触发ref的依赖
 * @param ref
 */
export function triggerRefValue(ref: RefBase<any>) {
	ref.dep && triggerEffects(ref.dep);
}

export function unRef(ref: any) {
	return isRef(ref) ? ref.value : ref;
}

export function isRef(r: any): r is Ref {
	return !!(r && r.__v_isRef === true);
}

export function toRef<T extends object, K extends keyof T>(
	target: T,
	key: K,
	defaultValue?: T[K]
): Ref<T[K]> {
	if (isRef(target)) {
		return target;
	} else if (isObject(target)) {
		return propertyToRef(target, key as string, defaultValue) as Ref<T[K]>;
	}
	return ref(target) as any;
}

export function toRefs<T extends object>(target: T): ToRefs<T> {
	if (!isProxy(target)) {
		console.warn(`toRefs() expects a reactive object but received a plain one.`);
	}

	const ret: any = Array.isArray(target) ? Array.from({ length: target.length }) : {};

	for (const key in target) {
		ret[key] = propertyToRef(target, key);
	}

	return ret;
}

function propertyToRef(target: Record<string, any>, key: string, defaultValue?: any) {
	const val = target[key];
	if (isRef(val)) {
		return val;
	}
	return new ObjectRefImpl(target, key, defaultValue);
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
	get(target, key, receiver) {
		return unRef(Reflect.get(target, key, receiver));
	},
	set(target, key, value, receiver) {
		const oldValue = target[key];

		if (isRef(oldValue)) {
			oldValue.value = value;
			return true;
		} else {
			return Reflect.set(target, key, value, receiver);
		}
	}
};

export function proxyRefs<T extends object>(objectWithRefs: T): ShallowUnwrapRef<T> {
	return isReactive(objectWithRefs)
		? (objectWithRefs as any)
		: new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

class ObjectRefImpl<T extends object, K extends keyof T> {
	public readonly __v_isRef = true;

	constructor(
		private readonly _object: T,
		private readonly _key: K,
		private readonly _defaultValue?: T[K]
	) {}

	get value() {
		const val = this._object[this._key];
		return val === undefined ? this._defaultValue : val;
	}

	set value(newVal) {
		this._object[this._key] = newVal;
	}
}

type BaseTypes = string | number | boolean;

export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true };

export interface RefUnwrapBailTypes {}

export type ShallowUnwrapRef<T> = {
	[K in keyof T]: DistrubuteRef<T[K]>;
};

type DistrubuteRef<T> = T extends Ref<infer V> ? V : T;

export type UnwrapRef<T> =
	T extends ShallowRef<infer V>
		? V
		: T extends Ref<infer V>
			? UnwrapRefSimple<V>
			: UnwrapRefSimple<T>;

export type UnwrapRefSimple<T> = T extends
	| Function
	| BaseTypes
	| Ref
	| RefUnwrapBailTypes[keyof RefUnwrapBailTypes]
	| { [RawSymbol]?: true }
	? T
	: T extends Map<infer K, infer V>
		? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>>
		: T extends WeakMap<infer K, infer V>
			? WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakMap<any, any>>>
			: T extends Set<infer V>
				? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>>
				: T extends WeakSet<infer V>
					? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>>
					: T extends ReadonlyArray<any>
						? { [K in keyof T]: UnwrapRefSimple<T[K]> }
						: T extends object & { [ShallowReactiveMarker]?: never }
							? {
									[P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
								}
							: T;
