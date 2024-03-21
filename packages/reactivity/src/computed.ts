import { NOOP, isFunction } from "@vue/shared";
import { type ReactiveEffect, effect, track, trigger } from "./effect";

export type ComputedGetter<T> = (oldValue?: T) => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T> {
	get: ComputedGetter<T>;
	set: ComputedSetter<T>;
}

class ComputedRefImpl<T> {
	// 标记是否需要重新计算值
	private _dirty = false;

	// 缓存值
	private _value!: T;

	public readonly effect: ReactiveEffect;

	public readonly __v_isRef = true;

	constructor(private getter: ComputedGetter<T>, private readonly _setter: ComputedSetter<T>) {
		this.effect = effect(this.getter, {
			lazy: true,
			schedule: () => {
				// 依赖发生变化时，重置标志
				this._dirty = false;
				// 如果在effect中执行则需要手动触发依赖
				trigger(this, "value");
			}
		});
	}

	set value(newValue: T) {
		this._setter(newValue);
	}

	get value() {
		if (this._dirty) return this._value;
		this._dirty = true;
		this._value = this.effect();
		// 如果在effect中执行则需要手动收集依赖
		track(this, "value");
		return this._value;
	}
}

export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
	let getter: ComputedGetter<T>;
	let setter: ComputedSetter<T>;

	if (isFunction(getterOrOptions)) {
		getter = getterOrOptions;
		setter = NOOP;
	} else {
		getter = getterOrOptions.get;
		setter = getterOrOptions.set;
	}

	return new ComputedRefImpl<T>(getter, setter);
}
