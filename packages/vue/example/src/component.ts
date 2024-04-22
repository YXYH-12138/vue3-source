import { ensureRenderer, createVnode } from "../../../runtime-core/src";

const renderer = ensureRenderer();

const ComponentVNode = {
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
			)
		]);
	}
};

const component = {
	type: ComponentVNode
};

renderer.render(component, document.querySelector("#app")!);
