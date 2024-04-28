let currentInstance: any;

type LifecycleFn = (this: any) => void;

export function setCurrentInstance(instance: any) {
	currentInstance = instance;
}

export function onMounted(fn: LifecycleFn) {
	if (currentInstance) {
		currentInstance.mounted.push(fn);
	} else {
		console.warn("onMounted called without active instance.");
	}
}

export function onUnmounted(fn: LifecycleFn) {
	if (currentInstance) {
		currentInstance.unMounted.push(fn);
	} else {
		console.warn("onUnmounted called without active instance.");
	}
}
