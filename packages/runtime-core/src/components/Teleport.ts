import { isArray, isString } from "@mini-vue/shared";
import { VNode } from "../vnode";

export const isTeleport = (type: any): boolean => type.__isTeleport;

export const Teleport = {
	name: "Teleport",
	__isTeleport: true,
	props: { to: { type: String, required: true } },
	process(
		n1: VNode | undefined,
		n2: VNode,
		container: HTMLElement,
		anchor: HTMLElement | undefined,
		internars: any
	) {
		const { patch, patchChildren } = internars;

		const to = n2.props.to;
		if (!n1) {
			const target = isString(to) ? document.querySelector(to) : to;
			isArray(n2.children) && n2.children.forEach((c) => patch(null, c, target, anchor));
		} else {
			const newTarget = isString(to) ? document.querySelector(to) : to;
			patchChildren(n1, n2, container);
			if (n1.props.to !== to) {
				moveTeleport(n2, newTarget, anchor, internars);
			}
		}
	},
	move: moveTeleport
};

function moveTeleport(
	vnode: VNode,
	container: HTMLElement,
	anchor: HTMLElement | null,
	internars: any
) {
	const { insert } = internars;
	isArray(vnode.children) &&
		vnode.children.forEach((c) =>
			insert(c.component ? c.component.subTree.el : c.el, container, anchor)
		);
}
