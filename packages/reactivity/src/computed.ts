import { effect, track, trigger } from "./effect";

type ReturnComputed<T extends () => any> = { readonly value: ReturnType<T> };

export function computed<T extends () => any>(getter: T): ReturnComputed<T> {
	// 缓存值
	let value: ReturnType<T>;
	// 标记是否需要重新计算值
	let dirty = false;

	const effectFn = effect(getter, {
		lazy: true,
		schedule() {
			// 依赖发生变化时，重置标志
			dirty = false;
			// 如果在effect中执行则需要手动触发依赖
			trigger(obj, "value");
		}
	});

	const obj = {
		get value() {
			if (dirty) return value;
			dirty = true;
			value = effectFn();
			// 如果在effect中执行则需要手动收集依赖
			track(obj, "value");
			return value;
		}
	};

	return obj;
}
