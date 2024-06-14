export {
	createRenderer,
	type RendererOptions,
	type Renderer,
	type RootRenderFunction
} from "./renderer";
export { type App } from "./apiCreateApp";
export { onMounted, onUnmounted } from "./apiLifecycle";
export { getCurrentInstance } from "./component";
export { defineComponent } from "./apiDefineComponent";
export { type VNode, VNodeType, createVNode } from "./vnode";
export { defineAsyncComponent } from "./apiAsyncComponent";
export { KeepAlive } from "./components/KeepAlive";
export { Teleport } from "./components/Teleport";
