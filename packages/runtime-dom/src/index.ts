import { extend, isString } from "@mini-vue/shared";
import { patchProp } from "./patchProp";
import { nodeOps } from "./nodeOps";
import {
	type Renderer,
	type RootRenderFunction,
	type RendererOptions,
	type App,
	createRenderer
} from "@mini-vue/runtime-core";

const rendererOptions = extend({ patchProp }, nodeOps) as RendererOptions<Element | ShadowRoot>;

let renderer: Renderer<Element | ShadowRoot>;
function ensureRenderer() {
	return renderer || (renderer = createRenderer<Element | ShadowRoot>(rendererOptions));
}

export const render = ((...args) => {
	ensureRenderer().render(...args);
}) as RootRenderFunction<Element | ShadowRoot>;

export function createApp(rootComponent: object, rootProps?: object | null): App {
	const app = ensureRenderer().createApp(rootComponent, rootProps);

	const { mount } = app;
	app.mount = function (containerOrSelector) {
		const container = normalizeContainer(containerOrSelector);
		if (!container) return;
		container.innerHTML = "";

		mount(container);
	};

	return app;
}

function normalizeContainer(container: Element | ShadowRoot | string): Element | null {
	if (isString(container)) {
		const res = document.querySelector(container);
		return res;
	}

	return container as any;
}
