import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandlers";

const proxyMap = new WeakMap();

export function reactive<T extends object>(target: T) {
	return createReactiveObject(target, mutableHandlers);
}

function createReactiveObject<T extends object>(target: T, baseHandlers: ProxyHandler<any>): T {
	if (!isObject(target)) return target;
	// 检查对象是否代理过，如果已经代理过，则从缓存中返回
	let existingProxy = proxyMap.get(target);
	if (!existingProxy) {
		proxyMap.set(target, (existingProxy = new Proxy<T>(target, baseHandlers)));
	}
	return existingProxy;
}
