import { reactive, effect } from "@vue/reactivity";
import { createVnode, ensureRenderer, Fragment } from "../../../runtime-core/src";

const foo = reactive({ id: "foo", flag: true });

const renderer = ensureRenderer();

// console.log(vnode);

// setTimeout(() => {
// 	renderer.render(vnode2, document.querySelector("#app")!);
// }, 1000);

effect(() => {
	const vnode = {
		type: "div",
		props: { id: foo.id },
		children: foo.flag
			? [
					// { type: "span", children: "hello world" },
					// { type: "input", props: { form: "form1" } },
					{
						type: "button",
						children: "click",
						props: {
							disabled: false,
							onClick() {
								console.log(this);
							},
							onMouseenter() {
								console.log("enter");
							}
						}
					}
			  ]
			: "12"
	};

	const listVnode = {
		type: "ul",
		props: { id: foo.id },
		children: [
			{
				type: Fragment,
				children: [
					{ type: "li", children: "1" },
					{ type: "li", children: "2" }
				]
			}
		]
	};

	const oldNode1 = {
		type: "div",
		children: [
			{
				type: "p",
				children: "4",
				key: 4
			},
			{
				type: "p",
				children: "2",
				key: 2
			},
			{
				type: "p",
				children: "3",
				key: 3
			}
		]
	};
	const newNode2 = {
		type: "div",
		children: [
			{
				type: "p",
				children: "4",
				key: 4
			},
			{
				type: "p",
				children: "1",
				key: 1
			},
			{
				type: "p",
				children: "3",
				key: 3
			}
		]
	};

	renderer.render(foo.flag ? oldNode1 : newNode2, document.querySelector("#app")!);
});

setTimeout(() => {
	// foo.id = "hellow";
	foo.flag = false;
}, 1000);
