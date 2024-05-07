import { isObject } from "@mini-vue/shared";
import type { HostElement } from "./renderer";

export const Fragment = Symbol();
export const Text = Symbol();

export interface VNode {
	type?: string | Symbol | object;
	props?: any | null;
	key?: string | number | null;
	children?: VNode[] | string | null | number | object;
	el?: HostElement;
	component?: any;
	[key: string]: any;
}

export function createVnode(
	type: string | Symbol | object,
	props?: any | null,
	children?: VNode[] | string | null | number | object
): VNode {
	if (!isObject(children) && children != undefined) {
		children += "";
	}

	if (type == undefined) {
		type = Text;
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
