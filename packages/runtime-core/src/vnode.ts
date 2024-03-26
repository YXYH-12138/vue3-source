import type { HostElement } from "./renderer";

export const Fragment = Symbol();
export const Text = Symbol();

export interface VNode {
	type: string | Symbol;
	props?: any | null;
	key?: string | number | symbol | null;
	children?: VNode[] | string | null;
	el?: HostElement;
}

export function createVnode(
	type: string | Symbol,
	props?: any | null,
	children?: VNode[] | string | null
): VNode {
	return {
		type,
		props,
		children,
		key: props && props.key
	};
}
