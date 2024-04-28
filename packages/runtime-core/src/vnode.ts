import { isObject } from "@vue/shared";
import type { HostElement } from "./renderer";

export const Fragment = Symbol();
export const Text = Symbol();

export interface VNode {
	type: string | Symbol | object;
	props?: any | null;
	key?: string | number | null;
	children?: VNode[] | string | null | number;
	el?: HostElement;
	component?: any;
	[key: string]: any;
}

export function createVnode(
	type: string | Symbol | object,
	props?: any | null,
	children?: VNode[] | string | null | number
): VNode {
	if (!isObject(children)) {
		children += "";
	}

	return {
		type,
		props,
		children,
		key: props ? props.key : undefined
	};
}
