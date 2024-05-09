import { isArray } from "@mini-vue/shared";

type EventValue = Function | Function[];

interface Invoker extends EventListener {
	value: EventValue;
	attached: number;
}

const veiKey = Symbol("_vei");

export function patchEvent(
	el: Element & { [veiKey]?: Record<string, Invoker> },
	rawName: string,
	nextValue: any
) {
	const eventName = rawName.slice(2).toLowerCase();

	const invokers = el[veiKey] || (el[veiKey] = {});
	const existingInvoker = invokers[eventName];

	if (nextValue && existingInvoker) {
		existingInvoker.value = nextValue;
	} else {
		if (nextValue) {
			/**
			 * 绑定一个伪造的事件处理函数 invoker
			 * 更新事件的时候，不再需要调用 removeEventListener 函数来移除上一次绑定的事件，
			 * 只需要更新 invoker.value 的值即可
			 */
			const invoke = (invokers[eventName] = createInvoker(nextValue));
			el.addEventListener(eventName, invoke);
		} else if (existingInvoker) {
			el.removeEventListener(eventName, existingInvoker);
			invokers[rawName] = undefined;
		}
	}
}

function createInvoker(initialValue: EventValue) {
	const invoker: Invoker = (e: Event) => {
		// 如果事件触发的时间小于绑定的时间，应该不去执行(冒泡)事件
		if (e.timeStamp < invoker.attached) return;
		if (isArray(invoker.value)) {
			invoker.value.forEach((fn) => fn(e));
		} else {
			invoker.value!(e);
		}
	};

	invoker.value = initialValue;
	// 记录事件绑定的事件
	invoker.attached = performance.now();

	return invoker;
}
