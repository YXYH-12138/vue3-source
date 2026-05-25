import { extend, isMap } from "@mini-vue/shared";
import { ITERATE_KEY, MAP_KEYS_ITERATE_KEY } from "./baseHandlers";
import { TriggerOpTypes } from "./operations";

export type Dep = Map<ReactiveEffect, number> & { cleanup: () => void };

interface ReactiveEffectOptions {
	scheduler?: () => any;
	lazy?: boolean;
}

export interface ReactiveEffectRunner<T = any> {
	(): T;
	effect: ReactiveEffect;
}

// 当前激活的副作用
export let activeEffect: ReactiveEffect;

const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();

// 是否进行依赖收集的标记
let shouldTrack = true;
/**
 * 关闭依赖收集
 */
export function pauseTracking() {
	shouldTrack = false;
}
/**
 * 开启依赖收集
 */
export function enableTracking() {
	shouldTrack = true;
}

function preCleanEffect(effect: ReactiveEffect) {
	effect._trackId++;
	effect._depsLength = 0;
}

function postCleanEffect(effect: ReactiveEffect) {
	let maxLen = effect.deps.length;
	const depsLen = effect._depsLength;

	if (maxLen > effect._depsLength) {
		for (let i = depsLen; i < maxLen; i++) {
			// 删除对应的effect
			cleanDepEffect(effect, effect.deps[i]);
		}
		// 重置长度
		effect.deps.length = depsLen;
	}
}

class ReactiveEffect {
	// 是否是激活的
	_active = true;

	_trackId = 0;

	_depsLength = 0;

	_running = 0;

	deps: Dep[];

	lazy?: boolean;

	constructor(
		public fn: () => any,
		public scheduler: ReactiveEffectOptions["scheduler"]
	) {
		this.deps = [];
	}

	run() {
		if (!this._active) return this.fn();

		let lastEffect = activeEffect;

		try {
			this._running++;

			activeEffect = this;

			preCleanEffect(this);

			return this.fn();
		} finally {
			this._running--;

			postCleanEffect(this);

			activeEffect = lastEffect;
		}
	}
}

export function createDepMap(cleanup: () => void) {
	const dep = new Map() as Dep;
	dep.cleanup = cleanup;
	return dep;
}

/**
 * 收集副作用
 * @param target
 * @param key
 * @returns
 */
export function track(target: object, key: string | symbol) {
	if (!activeEffect || !shouldTrack) return;

	let depsMap = targetMap.get(target);
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()));
	}

	let dep = depsMap.get(key);
	if (!dep) {
		depsMap.set(
			key,
			(dep = createDepMap(() => {
				depsMap.delete(key);
			}))
		);
	}

	trackEffect(activeEffect, dep);
}

function cleanDepEffect(effect: ReactiveEffect, dep: Dep) {
	dep.delete(effect);
	if (dep.size === 0) {
		dep.cleanup();
	}
}

export function trackEffect(effect: ReactiveEffect, dep: Dep) {
	// 如果没有则需要进行依赖收集
	if (dep.get(effect) !== effect._trackId) {
		// 收集依赖
		dep.set(effect, effect._trackId);

		const oldDep = effect.deps[effect._depsLength];
		if (oldDep !== dep) {
			// 如果有旧的dep，则需要清除旧的dep
			if (oldDep) {
				cleanDepEffect(effect, oldDep);
			}

			// 更新effect对象中的dep
			effect.deps[effect._depsLength] = dep;
		}

		effect._depsLength++;
	}
}

/**
 * 触发依赖
 * @param target 对象
 * @param key 对象key
 * @param type 操作类型
 * @param newVal 新的值
 * @returns
 */
export function trigger(
	target: object,
	key: string | symbol,
	type = TriggerOpTypes.SET,
	newVal?: any
) {
	const depsMap = targetMap.get(target);
	if (!depsMap) return;

	const deps: Array<Dep | undefined> = [];

	deps.push(depsMap.get(key));

	/**
	 * 如果是对象添加key和删除，需要触发for in以及取keys相关操作的依赖
	 */
	if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE || isMap(target)) {
		/**
		 * 如果是Map的keys方法, 只关心 Map 类型数据的键的变化，而不关心值的变化
		 * 所以如果是Map的set操作，不应该触发更新
		 */
		if (type !== TriggerOpTypes.SET) {
			deps.push(depsMap.get(MAP_KEYS_ITERATE_KEY));
		}
		deps.push(depsMap.get(ITERATE_KEY));
	}

	if (Array.isArray(target)) {
		// 如果是添加新元素，触发length
		if (type === TriggerOpTypes.ADD) {
			deps.push(depsMap.get("length"));
		}
		/**
		 * 如果是直接修改的索引
		 * 找到所有索引值大于或等于新的 length 值的元素，然后把与它们相关联的副作用函数取出并执行。
		 */
		if (key === "length") {
			depsMap.forEach((value, key) => {
				if (Number(key) >= newVal) {
					deps.push(value);
				}
			});
		}
	}

	for (const dep of deps) {
		triggerEffects(dep);
	}
}

const queueEffectschedulerrs: (() => void)[] = [];

let pauseScheduleStack = 0;
export function pauseScheduling() {
	pauseScheduleStack++;
}

export function resetScheduling() {
	pauseScheduleStack--;
	while (!pauseScheduleStack && queueEffectschedulerrs.length) {
		queueEffectschedulerrs.shift()!();
	}
}

export function triggerEffects(dep: Dep) {
	pauseScheduling();

	for (const effect of dep.keys()) {
		// 如果副作用函数正在运行，则跳过
		if (effect._running) continue;
		// 调度器
		if (effect.scheduler) {
			queueEffectschedulerrs.push(effect.scheduler);
		}
	}

	resetScheduling();
}

export function effect(fn: () => any, options: ReactiveEffectOptions = {}) {
	const _effect = new ReactiveEffect(fn, () => {
		_effect.run();
	});

	if (options) {
		extend(_effect, options);
	}

	if (!options || !options.lazy) {
		_effect.run();
	}

	const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
	runner.effect = _effect;

	return runner;
}
