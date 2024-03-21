import { hasChanged, isObject } from "@vue/shared";
import { toReactive } from "./reactive";
import { track, trigger } from "./effect";

export interface Ref<T = any> {
	value: T;
}

type ToRefs<T = any> = {
	[K in keyof T]: Ref<T[K]>;
};

export function ref<T>(target: T) {
	return createRef<T>(target, false);
}

function createRef<T>(rawValue: T, shallow: boolean): Ref<T> {
	if (isRef(rawValue)) {
		return rawValue;
	}
	return new RefImpl<T>(rawValue, shallow);
}

class RefImpl<T> {
	public readonly __v_isRef = true;
	private _value: T;

	constructor(value: T, public readonly __v_isShallow: boolean) {
		this._value = __v_isShallow ? value : toReactive(value);
	}

	get value() {
		track(this, "value");
		return this._value;
	}

	set value(newValue) {
		if (hasChanged(this._value, newValue)) {
			this._value = this.__v_isShallow ? newValue : toReactive(newValue);
			trigger(this, "value");
		}
	}
}

export function isRef(r: any): r is Ref {
	return !!(r && r.__v_isRef === true);
}

export function toRef<T extends object, K extends keyof T>(target: T, key: K): Ref<T[K]> {
	if (!isObject(target)) {
		return target;
	}

	return defineRef({
		get value() {
			return target[key];
		},
		set value(val) {
			target[key] = val;
		}
	});
}

export function toRefs<T extends object>(target: T): ToRefs<T> {
	const ret: any = {};

	for (const key in target) {
		ret[key] = toRef(target, key);
	}

	return ret;
}

// 把 ref 里面的值拿到
export function unRef(ref: any) {
	return isRef(ref) ? ref.value : ref;
}

function defineRef(wrapper: any) {
	Object.defineProperty(wrapper, "__v_isRef", {
		value: true
	});

	return wrapper;
}
