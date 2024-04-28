import { reactive } from "../../../reactivity/src";
import { ensureRenderer, createVnode, Fragment } from "../../../runtime-core/src";

const renderer = ensureRenderer();

const childComponent = {
	props: { title: String },
	data() {
		return { a: 1 };
	},
	render(this: any) {
		return createVnode("div", undefined, [
			createVnode("span", null, this.a),
			createVnode(
				"button",
				{
					onClick: () => {
						this.a++;
					}
				},
				"+1"
			),
			createVnode(
				"button",
				{
					onClick: () => {
						this.a--;
					}
				},
				"-1"
			),
			createVnode("span", undefined, this.title)
		]);
	}
};

const patentComponent = {
	type: {
		data() {
			return { title: "hellow vue", foo: 114514 };
		},
		render(this: any) {
			return createVnode(Fragment, undefined, [
				createVnode(
					"button",
					{
						onClick: () => {
							console.log("change title");
							this.title = Math.random();
						}
					},
					"change title"
				),
				createVnode(childComponent, { title: this.title, foo: 111 })
			]);
		}
	}
};

renderer.render(patentComponent, document.querySelector("#app")!);
