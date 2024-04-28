import { reactive, ref } from "@vue/reactivity";
import { ensureRenderer, createVnode, Fragment, Text, onMounted } from "../../../runtime-core/src";

const renderer = ensureRenderer();

const childComponent = {
	props: { title: String },
	setup(props: any, setupContext: any) {
		const counter = ref(1);
		const { emit, slots } = setupContext;

		onMounted(() => {
			console.log("onMounted", document.querySelector(".hw"));
		});

		return () => {
			const vnodes = createVnode("div", { class: "hw" }, [
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
				createVnode("span", undefined, props.title),
				createVnode(Text, null, slots[0]?.default())
			]);
			return vnodes;
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
				createVnode(
					childComponent,
					{
						title: this.title,
						foo: 111,
						onChange: (val: any) => {
							this.foo = val;
						}
					},
					[{ default: () => "这是插槽内容" }]
				)
			]);
		}
	}
};

renderer.render(patentComponent, document.querySelector("#app")!);
