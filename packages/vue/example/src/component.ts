import { reactive, ref } from "@vue/reactivity";
import { ensureRenderer, createVnode, Fragment } from "../../../runtime-core/src";

const renderer = ensureRenderer();

const childComponent = {
	props: { title: String },
	setup(props: any, setupContext: any) {
		const counter = ref(1);
		const { emit } = setupContext;

		return () => {
			return createVnode("div", undefined, [
				createVnode("span", null, counter.value),
				createVnode(
					"button",
					{
						onClick: () => {
							counter.value++;
							emit("change", counter.value);
						}
					},
					"+1"
				),
				createVnode(
					"button",
					{
						onClick: () => {
							counter.value--;
							emit("change", counter.value);
						}
					},
					"-1"
				),
				createVnode("span", undefined, props.title)
			]);
		};
	}
};

const patentComponent = {
	type: {
		data() {
			return { title: "hellow vue", foo: 0 };
		},
		render(this: any) {
			return createVnode(Fragment, undefined, [
				createVnode(
					"button",
					{
						onClick: () => {
							this.title = Math.random();
						}
					},
					"change title" + this.foo
				),
				createVnode(childComponent, {
					title: this.title,
					foo: 111,
					onChange: (val: any) => {
						this.foo = val;
					}
				})
			]);
		}
	}
};

renderer.render(patentComponent, document.querySelector("#app")!);
