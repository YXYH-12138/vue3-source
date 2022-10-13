import { track, trigger } from "./effect";

export const mutableHandlers: ProxyHandler<object> = {
	get(target, key, receiver) {
		track(target, key);
		return Reflect.get(target, key, receiver);
	},
	set(target, key, value, receiver) {
		let oldValue = (target as any)[key];
		const result = Reflect.set(target, key, value, receiver);
		if (oldValue !== value) {
			trigger(target, key);
		}
		return result;
	}
};
