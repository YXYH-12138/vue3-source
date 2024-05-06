import { reactive, ref } from "@mini-vue/reactivity";
import {
	ensureRenderer,
	createVnode,
	Fragment,
	defineAsyncComponent,
	onMounted,
	onUnmounted,
	KeepAlive
} from "../../../runtime-core/src";

const renderer = ensureRenderer();

function functionalComp(props: any) {
	return createVnode("div", null, props.title);
}
(functionalComp as any).props = {
	title: String
};

const childComponent1 = {
	props: { title: String },
	setup(props: any, setupContext: any) {
		const counter = ref(1);
		const { emit, slots } = setupContext;

		onMounted(() => {
			console.log("onMounted", document.querySelector(".hw"));
		});

		onUnmounted(() => {
			console.log("onUnmounted");
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
				createVnode(null, null, slots[0]?.default())
			]);
			return vnodes;
		};
	}
};

const childComponent2 = {
	props: { title: String },
	setup(props: any) {
		const counter = ref(1);

		return () => {
			return createVnode(
				"div",
				{
					class: "hw2",
					onClick() {
						counter.value++;
					}
				},
				[
					// createVnode("span", null, "childComponent2"),
					createVnode("span", null, props.title + counter.value)
				]
			);
		};
	}
};
const childComponent3 = {
	props: { title: String },
	setup(props: any) {
		return () => {
			return createVnode("div", { class: "hw3" }, [
				// createVnode("span", null, "childComponent3"),
				createVnode("span", null, props.title)
			]);
		};
	}
};

let _attempts = 0;
function mockAsyncComponentLoader() {
	return new Promise<any>((resolve, reject) => {
		setTimeout(() => {
			if (_attempts < 0) {
				reject("error");
			} else {
				resolve(childComponent1);
			}
		}, 500);
	});
}

const AsyncComp = defineAsyncComponent({
	loader: mockAsyncComponentLoader,
	// timeout: 2000,
	onError(error, retry, fail, attempts) {
		_attempts = attempts;
		if (attempts < 3) {
			retry();
		} else {
			fail();
		}
	},
	errorComponent: {
		props: { error: Error },
		setup(props: any) {
			console.warn(props.error);
			return () => createVnode(null, null, "这是我的error");
		}
	},
	loadingComponent: {
		setup() {
			return () => createVnode(null, null, "这是我的loading");
		}
	}
});

const parentComponent = {
	type: {
		data() {
			return { title: "hellow vue", foo: 1 };
		},
		render(this: any) {
			return createVnode(Fragment, undefined, [
				// createVnode(
				// 	"button",
				// 	{
				// 		onClick: () => {
				// 			this.title = Math.random();
				// 		}
				// 	},
				// 	"change title" + this.foo
				// ),
				createVnode(
					childComponent1,
					{
						title: this.title,
						foo: 111,
						onChange: (val: any) => {
							this.foo = val;
						}
					},
					[{ default: () => "这是插槽内容" }]
				),
				createVnode(
					KeepAlive,
					{ max: 5 },
					{
						default: () => {
							return this.foo <= 1
								? createVnode(childComponent2, { key: 1, title: "keep-alive childComponent2" })
								: createVnode(childComponent3, { key: 2, title: "keep-alive childComponent3" });
						}
					}
				)
			]);
		}
	}
};

renderer.render(parentComponent, document.querySelector("#app")!);
