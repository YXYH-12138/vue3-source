import { hasChanged, isObject } from "@mini-vue/shared";
import { toReactive } from "./reactive";
import { type Dep, activeEffect, createDepMap, trackEffect, triggerEffects } from "./effect";

export interface Ref<T = any> {
	value: T;
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

function createRef<T>(rawValue: T, shallow: boolean): Ref<T> {
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

/**
 * 收集ref的依赖
 * @param ref
 * @returns
 */
function trackRefValue(ref: RefImpl<any>) {
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
function triggerRefValue(ref: RefImpl<any>) {
	ref.dep && triggerEffects(ref.dep);
}

export function unRef(ref: any) {
	return isRef(ref) ? ref.value : ref;
}

export function isRef(r: any): r is Ref {
	return !!(r && r.__v_isRef === true);
}

export function toRef<T extends object, K extends keyof T>(target: T, key: K): Ref<T[K]> {
	if (isRef(target)) {
		return target;
	} else if (isObject(target)) {
		return new ObjectRefImpl(target, key);
	}
	return ref(target[key]);
}

export function toRefs<T extends object>(target: T): ToRefs<T> {
	const ret: any = {};

	for (const key in target) {
		ret[key] = toRef(target, key);
	}

	return ret;
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
		return val === undefined ? this._defaultValue! : val;
	}

	set value(newVal) {
		this._object[this._key] = newVal;
	}
}
