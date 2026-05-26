import { isFunction, isObject, NOOP } from "@mini-vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";
import { isRef } from "./ref";

type OnCleanup = (cleanupFn: () => void) => void;
type WatchSource<T = any> = T | (() => T);
type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: OnCleanup) => any;

export type WatchEffect = (onCleanup: OnCleanup) => void;

export interface WatchOptionsBase {
	flush?: "pre" | "post" | "sync";
}

interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
	immediate?: Immediate;
	deep?: boolean;
}

export function watch<T = any, Immediate extends boolean = false>(
	source: WatchSource<T>,
	cb: WatchCallback<T, T>,
	options?: WatchOptions<Immediate>
) {
	return doWatch(source, cb, options);
}

export function watchEffect(effect: WatchEffect, options?: WatchOptionsBase) {
	return doWatch(effect, null, options);
}

function doWatch(
	source: WatchSource | WatchEffect,
	cb: WatchCallback | null,
	{ immediate, deep, flush }: WatchOptions = {}
) {
	let oldValue: any, newValue: any;

	let getter: () => any | WatchEffect;

	if (isFunction(source)) {
		if (cb) {
			getter = source;
		} else {
			// watchEffect
			getter = () => {
				cleanup && cleanup();
				source(onCleanup);
			};
		}
	} else if (isRef(source)) {
		getter = () => source.value;
	} else if (isReactive(source)) {
		getter = () => traverse(source, deep);
	} else {
		getter = () => source;
	}

	let cleanup: () => void;
	const onCleanup: OnCleanup = (cb) => {
		cleanup = () => {
			cb();
			cleanup = undefined;
		};
	};

	const job = () => {
		if (cb) {
			cleanup && cleanup();
			newValue = effect.run();
			cb(newValue, oldValue, onCleanup);
			oldValue = newValue;
		} else {
			// watchEffect
			effect.run();
		}
	};

	const effect = new ReactiveEffect(getter, NOOP, () => {
		if (flush === "post") {
			Promise.resolve().then(job);
		} else {
			job();
		}
	});

	if (cb) {
		if (immediate) {
			job();
		} else {
			oldValue = effect.run();
		}
	} else {
		// watchEffect
		effect.run();
	}

	const unwatch = () => effect.stop();

	return unwatch;
}

/**
 * 遍历属性，触发依赖收集
 * @param value
 * @param seen
 * @returns
 */
function traverse<T>(value: T, deep: boolean, seen = new Set()): T {
	// 是原始值或被读取过则直接返回
	if (!isObject(value) || seen.has(value)) return value;
	// 将数据添加到seen中，避免循环引用导致的问题
	seen.add(value);
	// 暂未考虑数组等其他结构
	for (const key in value) {
		deep ? traverse(value[key], deep, seen) : value[key];
	}
	return value;
}
