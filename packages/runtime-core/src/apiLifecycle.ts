import { getCurrentInstance } from "./component";

type LifecycleFn = (this: any) => void;

export function onMounted(fn: LifecycleFn) {
	const currentInstance = getCurrentInstance();
	if (currentInstance) {
		currentInstance.mounted.push(fn);
	} else {
		console.warn("onMounted called without active instance.");
	}
}

export function onUnmounted(fn: LifecycleFn) {
	const currentInstance = getCurrentInstance();
	if (currentInstance) {
		currentInstance.unMounted.push(fn);
	} else {
		console.warn("onUnmounted called without active instance.");
	}
}
