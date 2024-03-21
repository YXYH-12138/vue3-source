import { extend, hasChanged, hasOwn, isArray, isMap, isObject, isSet, isSymbol } from "@vue/shared";
import { enableTracking, pauseTracking, track, trigger } from "./effect";
import { TriggerOpTypes } from "./operations";
import { ReactiveFlags, reactive, readonly, toRaw, toReactive } from "./reactive";
import { isRef } from "./ref";

export const ITERATE_KEY = Symbol();
export const MAP_KEYS_ITERATE_KEY = Symbol();

const baseHandlers: ProxyHandler<object> = {
	// 删除属性时触发依赖
	deleteProperty(target, p) {
		const res = Reflect.deleteProperty(target, p);
		// 如果删除成功且没有了这个属性就触发删除操作
		if (res && !hasOwn(target, p)) {
			trigger(target, p, TriggerOpTypes.DELETE, p);
		}
		return res;
	},
	// in操作收集依赖
	has(target, p) {
		track(target, p);
		return Reflect.has(target, p);
	},
	/**
	 * for in以及取keys相关操作收集依赖
	 * 如果是数组，触发的应该是length相关的依赖
	 */
	ownKeys(target) {
		track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
		return Reflect.ownKeys(target);
	}
};

export const nomoralHandlers = extend(
	{ get: createGetter(false, false), set: createSetter(false) },
	baseHandlers
);

export const shallowHandlers = extend(
	{ get: createGetter(true, false), set: createSetter(false) },
	baseHandlers
);

export const readonlyHandlers = extend(
	{ get: createGetter(false, true), set: createSetter(true) },
	baseHandlers
);

export const shallowReadonlyHandlers = extend(
	{ get: createGetter(true, true), set: createSetter(true) },
	baseHandlers
);

const arrayInstrumentations: Record<string, Function> = {};
["includes", "indexOf", "lastIndexOf"].forEach((method) => {
	const originMethod = Array.prototype[method as any];
	arrayInstrumentations[method] = function (...args: any[]) {
		let result = originMethod.apply(this, args as any);
		// 必须是判断是否是false，indexOf可能返回0
		if (result === false || result === -1) {
			// 还需要通过原始对象调用方法
			result = originMethod.apply((this as any)[ReactiveFlags.RAW], args as any);
		}
		return result;
	};
});
/**
 * 以下方法间接读取length属性，建立不必要的依赖，需要重写
 */
["push", "pop", "shift", "unshift"].forEach((method) => {
	const originMethod = Array.prototype[method as any];
	arrayInstrumentations[method] = function (...args: any[]) {
		pauseTracking();
		const result = originMethod.apply(this, args as any);
		enableTracking();
		return result;
	};
});

/**
 * Map Set 方法的重写
 */
const mutableInstrumentations: Record<any, Function> = {
	delete(this: any, key: any) {
		const target = this[ReactiveFlags.RAW];
		const hadKey = target.has(key);
		const result = target.delete(key);
		if (hadKey) {
			trigger(target, key, TriggerOpTypes.DELETE);
		}
		return result;
	},
	get(this: any, key: any) {
		const target = this[ReactiveFlags.RAW];
		const result = target.get(key);
		// 值是否存在
		const hadKey = target.has(key);

		// 有值则追踪
		if (hadKey) {
			track(target, key);
		}
		// 如果获取的是一个对象则需要进行代理
		return toReactive(result);
	},
	set(this: any, key: any, value: any) {
		const target = this[ReactiveFlags.RAW];
		// 值是否存在
		const hadKey = target.has(key);
		// 旧值
		const oldValue = target.get(key);
		// 设置的时候value有可能是响应式数据，不能把响应式数据设置到原始数据上(数据污染)
		const result = target.set(key, value[ReactiveFlags.RAW] || value);
		// 如果之前已经有值则判断值是否改变
		if (!hadKey) {
			trigger(target, key, TriggerOpTypes.ADD);
		} else if (hasChanged(oldValue, value)) {
			trigger(target, key, TriggerOpTypes.SET);
		}
		return result;
	},
	add(this: any, value: any) {
		const target = this[ReactiveFlags.RAW];
		// 值是否存在
		const hadKey = target.has(value);
		// 旧值
		const oldValue = target.get(value);
		// 设置的时候value有可能是响应式数据，不能把响应式数据设置到原始数据上(数据污染)
		const result = target.add(value[ReactiveFlags.RAW] || value);
		// 如果之前已经有值则判断值是否改变
		if (!hadKey) {
			trigger(target, value, TriggerOpTypes.ADD);
		} else if (hasChanged(oldValue, value)) {
			trigger(target, value, TriggerOpTypes.SET);
		}
		return result;
	},
	forEach(this: any, callback: any, thisArg: any) {
		const target = this[ReactiveFlags.RAW];

		track(target, ITERATE_KEY);

		target.forEach((value: any, key: any) => {
			callback(toReactive(value), toReactive(key), this);
		}, thisArg);
	},
	/**
	 * 可迭代协议指的是一个对象实现了Symbol.iterator 方法，而迭代器协议指的是一个对象实现了 next 方法
	 * for of 需要实现可迭代协议
	 * m[Symbol.iterator] === m.entries
	 */
	[Symbol.iterator]: iterableMethod,
	entries: iterableMethod,
	values: valuesIterableMethod,
	keys: keysIterableMethod
};

function iterableMethod(this: any) {
	const target: any = this[ReactiveFlags.RAW];
	track(target, ITERATE_KEY);
	const itr = target[Symbol.iterator]() as IterableIterator<any>;

	return {
		// 迭代器协议
		next() {
			const { value, done } = itr.next();
			return {
				value: value != null ? [toReactive(value[0]), toReactive(value[1])] : value,
				done: done
			};
		},
		// 可迭代协议
		[Symbol.iterator]() {
			return this;
		}
	};
}
function valuesIterableMethod(this: any) {
	const target: any = this[ReactiveFlags.RAW];
	track(target, ITERATE_KEY);
	const itr = target.values() as IterableIterator<any>;

	return {
		// 迭代器协议
		next() {
			const { value, done } = itr.next();
			return {
				value: value != null ? toReactive(value) : value,
				done: done
			};
		},
		// 可迭代协议
		[Symbol.iterator]() {
			return this;
		}
	};
}
function keysIterableMethod(this: any) {
	const target: any = this[ReactiveFlags.RAW];
	track(target, MAP_KEYS_ITERATE_KEY);
	const itr = target.keys() as IterableIterator<any>;

	return {
		// 迭代器协议
		next() {
			const { value, done } = itr.next();
			return {
				value: value != null ? toReactive(value) : value,
				done: done
			};
		},
		// 可迭代协议
		[Symbol.iterator]() {
			return this;
		}
	};
}

/**
 * 取值时收集依赖
 * @param isShallow 是否浅响应
 * @param isReadonly 是否只读
 * @returns
 */
function createGetter(isShallow: boolean, isReadonly: boolean) {
	return function (target: object, key: string | symbol, receiver: any) {
		if (key === ReactiveFlags.RAW) {
			return target;
		}

		let value: any;
		/**
		 * Map对象的size是一个属性 需要改变this指向为原始对象
		 * 调用方法时需要把Map方法与原始数据对象绑定
		 */
		if (isMap(target) || isSet(target)) {
			if (key === "size") {
				track(target, ITERATE_KEY);
				return Reflect.get(target, "size", target);
			}
			return mutableInstrumentations[key as any];
		} else {
			value = Reflect.get(target, key, receiver);
		}

		if (isArray(target) && hasOwn(arrayInstrumentations, key)) {
			return Reflect.get(arrayInstrumentations, key, receiver);
		}

		if (isRef(value)) {
			value = value.value;
		}

		/**
		 * 如果是只读不需要收集依赖
		 * 由于数组的for of以及value会访问数组的Symbol.iterator,所以需要判断
		 */
		if (!isReadonly && !isSymbol(key)) {
			track(target, key);
		}

		if (isShallow) {
			return value;
		}

		// 如果是对象则重新代理
		if (isObject(value)) {
			return isReadonly ? readonly(value) : reactive(value);
		}

		return value;
	};
}

/**
 * 设置时触发依赖
 * @param isReadonly 是否只读
 * @returns
 */
function createSetter(isReadonly: boolean) {
	return function (target: any, key: string | symbol, value: any, receiver: any) {
		if (isReadonly) {
			console.warn(`属性${key.toString()}是只读的`);
			return true;
		}

		const oldValue = target[key];

		if (isRef(oldValue)) {
			oldValue.value = value;
			return true;
		}

		/**
		 * 数组添加新元素情况下判断索引是否超过当前长度
		 */
		const type = isArray(target)
			? Number(key) < target.length
				? TriggerOpTypes.SET
				: TriggerOpTypes.ADD
			: hasOwn(target, key)
			? TriggerOpTypes.SET
			: TriggerOpTypes.ADD;

		const result = Reflect.set(target, key, value, receiver);

		/**
		 * 1.值发生改变
		 * 2.只有当 receiver 是 target 的代理对象时才触发更新，这样就能屏蔽由原型引起的更新，从而避免不必要的更新操作。
		 * 才执行副作用函数
		 * */
		if (hasChanged(oldValue, value) && receiver[ReactiveFlags.RAW] === target) {
			const unTarget = isRef(target) ? toRaw(target) : target;
			trigger(unTarget, key, type, value);
		}
		return result;
	};
}
