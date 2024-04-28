let currentInstance: any;

export function setCurrentInstance(instance: any) {
	currentInstance = instance;
}

export function onMounted(fn: (this: any) => void) {
	if (currentInstance) {
		currentInstance.mounted.push(fn);
	} else {
		console.warn("onMounted called without active instance.");
	}
}
