import { isObject } from "@mini-vue/shared";
import type { RendererElement } from "./renderer";

export const enum VNodeType {
	Fragment = "_v_Fragment",
	Text = "_v_Text"
}

export interface VNode {
	type?: string | VNodeType | object;
	props?: any | null;
	key?: string | number | null;
	children?: VNode[] | string | null | number | object;
	el?: RendererElement;
	component?: any;
	[key: string]: any;
}

export function createVNode(
	type: string | VNodeType | object,
	props?: any | null,
	children?: VNode[] | string | null | number | object
): VNode {
	if (!isObject(children) && children != undefined) {
		children += "";
	}

	if (type == undefined) {
		type = VNodeType.Text;
	}

	return {
		type,
		props,
		children,
		key: props ? props.key : undefined
	};
}

export function isSameVNodeType(n1: VNode, n2: VNode) {
	return n1.type === n2.type && n1.key === n2.key;
}
