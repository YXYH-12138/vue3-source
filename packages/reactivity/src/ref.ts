import { isObject } from "@vue/shared";
import { reactive } from "./reactive";

export interface Ref<T = any> {
	value: T;
}

type ToRefs<T = any> = {
	[K in keyof T]: Ref<T[K]>;
};

export function ref<T>(target: T): Ref<T> {
	const wrapper = defineRef({ value: target });

	return reactive(wrapper);
}

export function isRef(r: any) {
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
