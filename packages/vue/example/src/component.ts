import { reactive, ref } from "@mini-vue/reactivity";
import {
	ensureRenderer,
	createVnode,
	Fragment,
	defineAsyncComponent,
	onMounted,
	onUnmounted
} from "../../../runtime-core/src";

const renderer = ensureRenderer();

function functionalComp(props: any) {
	return createVnode("div", null, props.title);
}
(functionalComp as any).props = {
	title: String
};

const childComponent = {
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

let _attempts = 0;
function mockAsyncComponentLoader() {
	return new Promise<any>((resolve, reject) => {
		setTimeout(() => {
			if (_attempts < 0) {
				reject("error");
			} else {
				resolve(childComponent);
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
				this.foo < 1
					? createVnode(
							AsyncComp,
							{
								title: this.title,
								foo: 111,
								onChange: (val: any) => {
									this.foo = val;
								}
							},
							[{ default: () => "这是插槽内容" }]
					  )
					: createVnode("div", null, 123),
				createVnode(functionalComp, { title: this.title })
			]);
		}
	}
};

renderer.render(patentComponent, document.querySelector("#app")!);
