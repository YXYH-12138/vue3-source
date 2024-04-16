import { effect } from "../src/effect";
import { reactive } from "../src/reactive";
import { isRef, ref, shallowRef, unRef } from "../src/ref";

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
});
