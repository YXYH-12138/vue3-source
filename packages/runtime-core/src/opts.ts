import { isArray, isOn } from "@vue/shared";
import type { RendererOptions } from "./renderer";

/** 判断是否应该设置DOM Properties */
function shouldSetAsProps(el: any, key: any) {
	// input的form是只读，不能通过el.xx去设置
	if (key === "form" && el.tagName === "INPUT") return false;
	return key in el;
}

export const opts: RendererOptions = {
	createElement(tag) {
		return document.createElement(tag);
	},
	insert(child, parent, anchor) {
		parent.insertBefore(child, anchor);
	},
	remove(el) {
		const parent = el.parentNode;
		if (parent) {
			parent.removeChild(el);
		}
	},
	createText(text?: string) {
		return document.createTextNode(text);
	},
	setText(el, text) {
		el.nodeValue = text;
	},
	setElementText(el, text) {
		el.textContent = text;
	},
	patchProp(el, key, prevValue, nextValue) {
		// 处理事件
		if (isOn(key)) {
			const eventName = key.slice(2).toLowerCase();
			let invoke = (el._invoke || (el._invoke = {}))[eventName];
			if (nextValue) {
				/**
				 * 绑定一个伪造的事件处理函数 invoker
				 * 更新事件的时候，不再需要调用 removeEventListener 函数来移除上一次绑定的事件，
				 * 只需要更新 invoker.value 的值即可
				 */
				if (!invoke) {
					invoke = el._invoke[eventName] = function (e: Event) {
						// 如果事件触发的时间小于绑定的时间，应该不去执行(冒泡)事件
						if (e.timeStamp < invoke.attached) return;
						if (isArray(invoke.value)) {
							invoke.value.forEach((fn) => fn.call(this, e));
						} else {
							invoke.value!.call(this, e);
						}
					};
					// 记录事件绑定的事件
					invoke.attached = performance.now();
					el.addEventListener(eventName, invoke, false);
				}
				invoke.value = nextValue;
			} else if (invoke) {
				el.removeEventListener(eventName, invoke);
			}
		} else if (key === "class") {
			el.className = nextValue;
		}
		// 优先设置元素的 DOM Properties
		else if (shouldSetAsProps(el, key)) {
			const type = typeof (el as any)[key];

			if (type === "boolean" && nextValue === "") {
				nextValue = true;
			}

			(el as any)[key] = nextValue;
		} else {
			// 否则调用setAttribute设置属性值
			el.setAttribute(key, nextValue);
		}
	}
};
