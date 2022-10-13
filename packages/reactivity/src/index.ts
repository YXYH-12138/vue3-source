import { effect } from "./effect";
import { reactive } from "./reactive";

const data1 = reactive({ a: "1", b: "2", show: true });
const data2 = reactive({ a: 1 });

// effect(() => {
// 	effect(() => {
// 		console.log(data1.b);
// 	});
// 	console.log(data1.a);
// });

effect(() => {
	console.log("我执行了");
	document.body.innerHTML = data1.show ? data1.a : data1.b;
});

setTimeout(() => {
	data1.show = false;
}, 100);

setTimeout(() => {
	data1.a = "22";
}, 500);
