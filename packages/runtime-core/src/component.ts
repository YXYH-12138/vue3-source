let currentInstance: any;

export function setCurrentInstance(instance: any) {
	currentInstance = instance;
}

export function getCurrentInstance() {
	return currentInstance;
}
