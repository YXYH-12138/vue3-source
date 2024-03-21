import { reactive, effect } from "@vue/reactivity";

const foo = reactive({ a: 1 });

effect(() => {
	console.log(foo.a);
});
