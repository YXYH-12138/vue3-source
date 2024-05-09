import type { RendererOptions } from "@mini-vue/runtime-core";

export const nodeOps: Omit<RendererOptions<Element>, "patchProp"> = {
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
	}
};
