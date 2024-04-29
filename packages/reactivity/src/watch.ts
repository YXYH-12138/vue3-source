import { isFunction, isObject } from "@mini-vue/shared";
import { effect } from "./effect";

type OnCleanup = (cleanupFn: () => void) => void;
type WatchSource<T = any> = T | (() => T);
type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: OnCleanup) => any;

interface WatchOptions<Immediate = boolean> {
	immediate?: Immediate;
	flush?: "pre" | "post" | "sync";
	// deep?: boolean;
}

export function watch<T, Immediate>(
	source: WatchSource<T>,
	cb: WatchCallback<T, T>,
	options?: WatchOptions<Immediate>
) {
	const flush = options?.flush || "post";
	let oldValue: any, newValue: any;

	let getter: () => T;

	if (isFunction(source)) {
		getter = source;
	} else {
		getter = () => traverse(source);
	}

	let cleanup: () => void;
	const onCleanup: OnCleanup = (cb) => {
		cleanup = cb;
	};

	const job = () => {
		cleanup && cleanup();
		newValue = effectFn();
		cb(newValue, oldValue, onCleanup);
		oldValue = newValue;
	};

	const effectFn = effect(getter, {
		lazy: true,
		schedule: () => {
			if (flush === "post") {
				Promise.resolve().then(job);
			} else {
				job();
			}
		}
	});

	if (options?.immediate) {
		job();
	} else {
		oldValue = effectFn();
	}
}

/**
 * 遍历属性，触发依赖收集
 * @param value
 * @param seen
 * @returns
 */
function traverse<T>(value: T, seen = new Set()): T {
	// 是原始值或被读取过则直接返回
	if (!isObject(value) || seen.has(value)) return value;
	// 将数据添加到seen中，避免循环引用导致的问题
	seen.add(value);
	// 暂未考虑数组等其他结构
	for (const key in value) {
		traverse(value[key], seen);
	}
	return value;
}
