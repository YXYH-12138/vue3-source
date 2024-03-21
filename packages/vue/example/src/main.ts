import { reactive, effect } from "@vue/reactivity";
import { createRenderer } from "@vue/runtime-core";

const foo = reactive({ a: 1 });

const renderer = createRenderer();

effect(() => {
	// console.log(foo.a);
	renderer.render({}, document.querySelector("#app")!);
});
