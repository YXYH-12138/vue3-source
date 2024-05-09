import { isOn } from "@mini-vue/shared";
import { patchEvent } from "./modules/events";
import { patchClass } from "./modules/class";
import { patchStyle } from "./modules/style";
import type { RendererOptions } from "@mini-vue/runtime-core";

/** 判断是否应该设置DOM Properties */
function shouldSetAsProps(el: any, key: any) {
	// input的form是只读，不能通过el.xx去设置
	if (key === "form" && el.tagName === "INPUT") return false;
	return key in el;
}

export const patchProp: RendererOptions<Element>["patchProp"] = (el, key, prevValue, nextValue) => {
	if (key === "class") {
		patchClass(el, nextValue, false);
	} else if (key === "style") {
		patchStyle(el, prevValue, nextValue);
	} else if (isOn(key)) {
		patchEvent(el, key, nextValue);
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
};
