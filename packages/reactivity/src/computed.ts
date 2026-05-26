import { NOOP, isFunction } from "@mini-vue/shared";
import { Dep, ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue, type Ref } from "./ref";
import { ReactiveFlags } from "./constants";

declare const ComputedRefSymbol: unique symbol;

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
	readonly value: T;
	[ComputedRefSymbol]: true;
}

export interface WritableComputedRef<T> extends Ref<T> {
	readonly effect: ReactiveEffect<T>;
}

export type ComputedGetter<T> = (oldValue?: T) => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T> {
	get: ComputedGetter<T>;
	set: ComputedSetter<T>;
}

class ComputedRefImpl<T> {
	dep: Dep;

	// 缓存值
	private _value!: T;

	readonly effect: ReactiveEffect;

	public readonly [ReactiveFlags.IS_READONLY]: boolean = false;

	readonly __v_isRef = true;

	constructor(
		private getter: ComputedGetter<T>,
		private readonly _setter: ComputedSetter<T>,
		isReadonly: boolean
	) {
		this.effect = new ReactiveEffect(this.getter, () => {
			// 使用trigger
			triggerRefValue(this);
		});
		(this.effect as any).__cmp = true;
		this[ReactiveFlags.IS_READONLY] = isReadonly;
	}

	set value(newValue: T) {
		this._setter(newValue);
	}

	get value() {
		// 对于嵌套的computed，需要进行依赖收集
		trackRefValue(this);
		if (this.effect.dirty) {
			// const oldValue = this._value;
			this._value = this.effect.run();
			// if (hasChanged(oldValue, this._value)) {
			// 	triggerRefValue(this);
			// }
		}
		return this._value;
	}
}

export function computed<T>(
	getter: ComputedGetter<T>
	// debugOptions?: DebuggerOptions,
): ComputedRef<T>;
export function computed<T>(
	options: WritableComputedOptions<T>
	// debugOptions?: DebuggerOptions,
): WritableComputedRef<T>;

export function computed<T>(
	getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
): ComputedRef<T> {
	let getter: ComputedGetter<T>;
	let setter: ComputedSetter<T>;

	const onlyGetter = isFunction(getterOrOptions);

	if (onlyGetter) {
		getter = getterOrOptions;
		setter = NOOP;
	} else {
		getter = getterOrOptions.get;
		setter = getterOrOptions.set;
	}

	return new ComputedRefImpl<T>(getter, setter, onlyGetter || !setter) as any;
}
