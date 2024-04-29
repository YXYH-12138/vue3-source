import { ref, shallowRef } from "@mini-vue/reactivity";
import { isFunction } from "@mini-vue/shared";
import { createVnode } from "./vnode";
import { onUnmounted } from "./apiLifecycle";
import { defineComponent } from "./apiDefineComponent";

type Component = object;

type AsyncComponentResolveResult<T = Component> =
	| T
	| {
			default: T;
	  };
export type AsyncComponentLoader<T = any> = () => Promise<AsyncComponentResolveResult<T>>;
export interface AsyncComponentOptions<T = any> {
	loader: AsyncComponentLoader<T>;
	loadingComponent?: Component;
	errorComponent?: Component;
	delay?: number;
	timeout?: number;
	onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any;
}

export function defineAsyncComponent<T extends Component = any>(
	source: AsyncComponentLoader<T> | AsyncComponentOptions<T>
) {
	if (isFunction(source)) {
		source = { loader: source };
	}

	const { loader, delay, loadingComponent, errorComponent, timeout, onError } = source;

	// 记录重试次数
	let attempts = 0;
	function load() {
		return loader().catch((err) => {
			if (onError) {
				return new Promise((resolve, reject) => {
					const retry = () => {
						attempts++;
						resolve(load());
					};
					const fail = () => reject(err);
					onError(err, retry, fail, attempts);
				});
			} else {
				throw err;
			}
		});
	}

	return defineComponent({
		name: "AsyncComponentWarpper",
		setup(props, { attrs, slots }) {
			// 是否加载完成
			const loaded = ref(false);
			// 加载loading
			const loading = ref(false);

			const error = shallowRef<Error>();

			if (delay) {
				setTimeout(() => {
					loading.value = true;
				}, delay);
			} else {
				loading.value = true;
			}

			let timer: any;
			if (timeout) {
				timer = setTimeout(() => {
					error.value = new Error(`Async component timed out after ${timeout}ms.`);
				}, timeout);
			}
			onUnmounted(() => clearTimeout(timer));

			let InnerComp: any;

			load()
				.then((result) => {
					InnerComp = result;
					loaded.value = true;
					clearTimeout(timer);
				})
				.catch((err) => {
					error.value = new Error(err);
				})
				.finally(() => {
					loading.value = false;
				});

			return () => {
				if (error.value && errorComponent) {
					return createVnode(errorComponent, { error: error.value });
				} else if (loaded.value) {
					return createVnode(InnerComp, { ...attrs, ...props }, slots);
				} else if (loading.value && loadingComponent) {
					return createVnode(loadingComponent);
				} else {
					return createVnode(undefined, undefined, "");
				}
			};
		}
	});
}
