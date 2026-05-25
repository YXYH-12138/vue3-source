import { effect } from "../src/effect";
import { reactive, isReactive } from "../src/reactive";
import { isRef, proxyRefs, ref, shallowRef, toRef, toRefs, unRef } from "../src/ref";

describe("ref", () => {
	it("should be reactive", () => {
		const a = ref(1);
		let dummy;
		let calls = 0;
		effect(() => {
			calls++;
			dummy = a.value;
		});
		expect(calls).toBe(1);
		expect(dummy).toBe(1);
		a.value = 2;
		expect(calls).toBe(2);
		expect(dummy).toBe(2);
		// same value should not trigger
		a.value = 2;
		expect(calls).toBe(2);
		expect(dummy).toBe(2);
	});

	it("should make nested properties reactive", () => {
		const a = ref({
			count: 1
		});
		let dummy;
		effect(() => {
			dummy = a.value.count;
		});
		expect(dummy).toBe(1);
		a.value.count = 2;
		expect(dummy).toBe(2);
	});

	it("isRef", () => {
		const a = ref(1);
		const user = reactive({
			age: 1
		});
		expect(isRef(a)).toBe(true);
		expect(isRef(1)).toBe(false);
		expect(isRef(user)).toBe(false);
	});

	it("unRef", () => {
		const a = ref(1);
		expect(unRef(a)).toBe(1);
		expect(unRef(1)).toBe(1);
	});

	test("shallowRef", () => {
		const sref = shallowRef({ a: 1 });
		// expect(isReactive(sref.value)).toBe(false);

		let dummy;
		effect(() => {
			dummy = sref.value.a;
		});
		expect(dummy).toBe(1);

		sref.value = { a: 2 };
		// expect(isReactive(sref.value)).toBe(false);
		expect(dummy).toBe(2);
	});

	test("shallowRef force trigger", () => {
		const sref = shallowRef({ a: 1 });
		let dummy;
		effect(() => {
			dummy = sref.value.a;
		});
		expect(dummy).toBe(1);

		sref.value.a = 2;
		expect(dummy).toBe(1); // should not trigger yet

		// force trigger
		// triggerRef(sref);
		// expect(dummy).toBe(2);
	});

	test("toRef", () => {
		const a = reactive({
			x: 1
		});
		const x = toRef(a, "x");
		expect(isRef(x)).toBe(true);
		expect(x.value).toBe(1);

		// source -> proxy
		a.x = 2;
		expect(x.value).toBe(2);

		// proxy -> source
		x.value = 3;
		expect(a.x).toBe(3);

		// reactivity
		let dummyX;
		effect(() => {
			dummyX = x.value;
		});
		expect(dummyX).toBe(x.value);

		// mutating source should trigger effect using the proxy refs
		a.x = 4;
		expect(dummyX).toBe(4);

		// should keep ref
		const r = { x: ref(1) };
		expect(toRef(r, "x")).toBe(r.x);
	});

	test("toRef on array", () => {
		const a = reactive(["a", "b"]);
		const r = toRef(a, 1);
		expect(r.value).toBe("b");
		r.value = "c";
		expect(r.value).toBe("c");
		expect(a[1]).toBe("c");
	});

	test("toRef default value", () => {
		const a: { x: number | undefined } = { x: undefined };
		const x = toRef(a, "x", 1);
		expect(x.value).toBe(1);

		a.x = 2;
		expect(x.value).toBe(2);

		a.x = undefined;
		expect(x.value).toBe(1);
	});

	// test("toRef getter", () => {
	// 	const x = toRef(() => 1);
	// 	expect(x.value).toBe(1);
	// 	expect(isRef(x)).toBe(true);
	// 	expect(unref(x)).toBe(1);
	// 	//@ts-expect-error
	// 	expect(() => (x.value = 123)).toThrow();

	// 	expect(isReadonly(x)).toBe(true);
	// });

	test("toRefs", () => {
		const a = reactive({
			x: 1,
			y: 2
		});

		const { x, y } = toRefs(a);

		expect(isRef(x)).toBe(true);
		expect(isRef(y)).toBe(true);
		expect(x.value).toBe(1);
		expect(y.value).toBe(2);

		// source -> proxy
		a.x = 2;
		a.y = 3;
		expect(x.value).toBe(2);
		expect(y.value).toBe(3);

		// proxy -> source
		x.value = 3;
		y.value = 4;
		expect(a.x).toBe(3);
		expect(a.y).toBe(4);

		// reactivity
		let dummyX, dummyY;
		effect(() => {
			dummyX = x.value;
			dummyY = y.value;
		});
		expect(dummyX).toBe(x.value);
		expect(dummyY).toBe(y.value);

		// mutating source should trigger effect using the proxy refs
		a.x = 4;
		a.y = 5;
		expect(dummyX).toBe(4);
		expect(dummyY).toBe(5);
	});

	test("toRefs should warn on plain object", () => {
		console.warn = vi.fn();
		toRefs({});
		expect(console.warn).toHaveBeenCalledWith(
			`toRefs() expects a reactive object but received a plain one.`
		);
	});

	test("toRefs should warn on plain array", () => {
		console.warn = vi.fn();
		toRefs([]);
		expect(console.warn).toHaveBeenCalledWith(
			`toRefs() expects a reactive object but received a plain one.`
		);
	});

	test("toRefs reactive array", () => {
		const arr = reactive(["a", "b", "c"]);
		const refs = toRefs(arr);

		expect(Array.isArray(refs)).toBe(true);

		refs[0].value = "1";
		expect(arr[0]).toBe("1");

		arr[1] = "2";
		expect(refs[1].value).toBe("2");
	});

	describe("proxyRefs", () => {
		test("should unwrap ref values on read", () => {
			const obj = { foo: ref(1), bar: 2 };
			const proxy = proxyRefs(obj);

			expect(proxy.foo).toBe(1);
			expect(proxy.bar).toBe(2);
		});

		test("toRefs", () => {
			const obj = reactive({ foo: 1, bar: 2 });
			const proxy = proxyRefs({ ...toRefs(obj) });
			expect(proxy.foo).toBe(1);
			expect(proxy.bar).toBe(2);
		});

		test("should unwrap ref values on write", () => {
			const obj = { foo: ref(1) };
			const proxy = proxyRefs(obj);

			proxy.foo = 2;
			expect(proxy.foo).toBe(2);
			expect(obj.foo.value).toBe(2);
		});

		test("should work with non-ref properties (get/set)", () => {
			const obj = { x: 10 };
			const proxy = proxyRefs(obj);

			expect(proxy.x).toBe(10);
			proxy.x = 20;
			expect(proxy.x).toBe(20);
			expect(obj.x).toBe(20);
		});

		test("should return reactive object as-is", () => {
			const obj = reactive({ foo: ref(1) });
			const proxy = proxyRefs(obj);

			expect(proxy).toBe(obj);
			expect(isReactive(proxy)).toBe(true);
		});

		test("isRef check on proxy", () => {
			const obj = { foo: ref(1) };
			const proxy = proxyRefs(obj);

			expect(isRef(proxy)).toBe(false);
		});

		test("should track ref changes via effect", () => {
			const obj = { foo: ref(1) };
			const proxy = proxyRefs(obj);
			let dummy;
			effect(() => {
				dummy = proxy.foo;
			});
			expect(dummy).toBe(1);

			obj.foo.value = 2;
			expect(dummy).toBe(2);
		});
	});
});
