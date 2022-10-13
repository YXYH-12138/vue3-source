import { effect } from "./effect";
import { reactive } from "./reactive";

const obj = reactive({ a: 1 });

const data1 = reactive(obj);
const data2 = reactive(obj);

effect(() => {
	document.body.innerHTML = data1.a + "";
});

setTimeout(() => {
	data2.a = 333;
}, 1000);
