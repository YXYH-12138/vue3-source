type KeyToDepMap = Map<any, Set<ReactiveEffect>>;

// 保存对象对应key的依赖 {target -> key -> dep}
const targetMap = new WeakMap<any, KeyToDepMap>();

export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any> {
	public active = true;
	public deps: Set<ReactiveEffect>[] = [];
	private parentEffect: undefined | ReactiveEffect;

	constructor(public fn: () => T) {}

	run() {
		if (this === activeEffect) return;
		if (!this.active) return this.fn();
		this.parentEffect = activeEffect;
		activeEffect = this;
		cleanupEffect(this);
		try {
			return this.fn();
		} finally {
			activeEffect = this.parentEffect;
			this.parentEffect = undefined;
		}
	}

	stop() {
		this.active = false;
	}
}

export function track<T extends object>(target: T, key: any) {
	if (!activeEffect) return;
	let depMap = targetMap.get(target);
	if (!depMap) {
		targetMap.set(target, (depMap = new Map()));
	}
	let deps = depMap.get(key);
	if (!deps) {
		depMap.set(key, (deps = new Set()));
	}
	if (!deps.has(activeEffect)) {
		deps.add(activeEffect);
		activeEffect.deps.push(deps);
	}
}

export function cleanupEffect(effect: ReactiveEffect) {
	const { deps } = effect;
	const len = deps.length;
	if (len) {
		for (let i = 0; i < len; i++) {
			deps[i].delete(effect);
		}
		deps.length = 0;
	}
}

export function trigger<T extends object>(target: T, key: any) {
	const depMap = targetMap.get(target);
	if (!depMap) return;
	const deps = depMap.get(key);
	if (!deps) return;
	Array.from(deps).forEach((dep) => {
		dep.run();
	});
}

export function effect<T = any>(fn: () => T) {
	const _effect = new ReactiveEffect<T>(fn);
	return _effect.run();
}
