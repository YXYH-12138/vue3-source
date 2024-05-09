import { reactive, ref } from "@mini-vue/reactivity";
import {
	createVNode,
	Fragment,
	defineAsyncComponent,
	onMounted,
	onUnmounted,
	KeepAlive,
	Teleport,
	defineComponent
} from "@mini-vue/runtime-core";
import { createApp } from "@mini-vue/runtime-dom";

function functionalComp(props: any) {
	return createVNode("div", null, props.title);
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
			const vnodes = createVNode("div", { class: "hw" }, [
				// createVNode("span", null, counter.value),
				createVNode(
					"button",
					{
						onClick: () => {
							counter.value++;
							emit("change", counter.value);
						}
					},
					"+1"
				),
				createVNode(
					"button",
					{
						onClick: () => {
							counter.value--;
							emit("change", counter.value);
						}
					},
					"-1"
				),
				createVNode("span", undefined, props.title)
				// createVNode(null, null, slots[0]?.default())
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
			return createVNode(
				"div",
				{
					class: "hw2",
					onClick() {
						counter.value++;
					}
				},
				[
					// createVNode("span", null, "childComponent2"),
					createVNode("span", null, props.title + counter.value)
				]
			);
		};
	}
};
const childComponent3 = {
	props: { title: String },
	setup(props: any) {
		return () => {
			return createVNode("div", { class: "hw3" }, [
				// createVNode("span", null, "childComponent3"),
				createVNode("span", null, props.title)
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
			return () => createVNode(null, null, "这是我的error");
		}
	},
	loadingComponent: {
		setup() {
			return () => createVNode(null, null, "这是我的loading");
		}
	}
});

const parentComponent = defineComponent({
	setup() {
		const state = reactive({ title: "hellow vue", foo: 1 });

		const change = (val: any) => {
			state.foo = val;
		};

		return () => {
			return createVNode(Fragment, undefined, [
				// createVNode(
				// 	"button",
				// 	{
				// 		onClick: () => {
				// 			this.title = Math.random();
				// 		}
				// 	},
				// 	"change title" + this.foo
				// ),
				createVNode(
					childComponent1,
					{
						title: "counter:" + state.foo,
						foo: 111,
						onChange: change
					},
					[{ default: () => "这是插槽内容" }]
				),
				// state.foo <= 1
				// 	? createVNode(Teleport, { to: "body", key: "Teleport" }, [
				// 			createVNode(
				// 				childComponent2,
				// 				{ key: 1, title: "keep-alive childComponent2" },
				// 				"keep-alive childComponent2"
				// 			)
				// 	  ])
				// 	: createVNode(
				// 			childComponent3,
				// 			{ key: 2, title: "keep-alive childComponent3" },
				// 			"keep-alive childComponent3"
				// 	  )
				createVNode(
					KeepAlive,
					{ max: 5 },
					{
						default: () => {
							return state.foo <= 1
								? createVNode(Teleport, { to: "body" }, [
										createVNode(childComponent2, { title: "keep-alive childComponent2" })
								  ])
								: createVNode(childComponent3, { title: "keep-alive childComponent3" });
						}
					}
				)
			]);
		};
	}
});

createApp(parentComponent).mount("#app");
