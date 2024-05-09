import { RootRenderFunction } from "./renderer";
import { createVNode } from "./vnode";

export interface App<HostElement = any> {
	mount(rootContainer: HostElement | string): void;
}

export type CreateAppFunction<HostElement> = (
	rootComponent: object,
	rootProps?: object | null
) => App<HostElement>;

export function createAppAPI<HostElement>(
	render: RootRenderFunction<HostElement>
): CreateAppFunction<HostElement> {
	return function (rootComponent, rootProps = null) {
		const app = {
			mount(rootContainer: HostElement) {
				const vnode = createVNode(rootComponent, rootProps);
				render(vnode, rootContainer);
			}
		};

		return app;
	};
}
