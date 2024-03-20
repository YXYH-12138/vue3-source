import { isMap } from "@vue/shared";
import { ITERATE_KEY, MAP_KEYS_ITERATE_KEY } from "./baseHandlers";
import { TriggerOpTypes } from "./operations";

type Dep = Set<ReactiveEffect>;
interface IEffectOptions {
	schedule?: (effect: ReactiveEffect) => any;
	lazy?: boolean;
}
interface IEffectFnOptions {
	options: IEffectOptions;
	deps: Array<Set<ReactiveEffect>>;
}
export interface ReactiveEffect extends Function, IEffectOptions, IEffectFnOptions {}

// 当前激活的副作用
let activeEffect: ReactiveEffect;

const effectStack: ReactiveEffect[] = [];

const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();
// console.log(targetMap);
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

/**
 * 清除副作用
 * @param effect
 */
function cleanup(effect: ReactiveEffect) {
	effect.deps.forEach((dep) => dep.delete(effect));
	effect.deps.length = 0;
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
		depsMap.set(key, (dep = new Set()));
	}
	dep.add(activeEffect);
	activeEffect.deps.push(dep);
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

	// 可以避免重复执行，当effect执行时由于删除了当前的依赖，会重新收集，然后dep长度会加+1，导致无限循环
	const effects: ReactiveEffect[] = [];
	for (const dep of deps) {
		if (dep) {
			effects.push(...dep);
		}
	}

	triggerEffect(effects);
}

function triggerEffect(deps: Array<ReactiveEffect>) {
	deps.forEach((effect) => {
		// 如果当前要执行的effect和激活的effect相同，则跳过执行
		if (activeEffect === effect) return;
		// 调度器
		if (effect.options.schedule) {
			effect.options.schedule(effect);
		} else {
			effect();
		}
	});
}

export function effect(fn: () => any, options: IEffectOptions = {}) {
	const effectFn: ReactiveEffect = () => {
		cleanup(effectFn);
		activeEffect = effectFn;
		effectStack.push(effectFn);
		const res = fn();
		// 执行完后弹出栈顶的effect
		effectStack.pop();
		// 还原之前的effect
		activeEffect = effectStack[effectStack.length - 1];
		return res;
	};
	effectFn.options = options;
	effectFn.deps = [];

	if (!options.lazy) {
		effectFn();
	}
	return effectFn;
}
