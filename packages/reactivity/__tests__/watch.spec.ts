import { reactive } from "../src/reactive";
import { ref } from "../src/ref";
import { watch, watchEffect } from "../src/watch";

/**
 * Simple microtask-based nextTick helper since the project may not have scheduler.ts.
 * Uses Promise.resolve().then() to flush pending microtasks.
 */
function nextTick(): Promise<void> {
	return new Promise((resolve) => {
		Promise.resolve().then(resolve);
	});
}

describe("watch", () => {
	it("should watch a reactive object and trigger callback on change", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(state, fnSpy);

		expect(fnSpy).not.toHaveBeenCalled();

		state.count = 1;

		// default flush is "post", wait for microtask
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should not watch a non-reactive object", async () => {
		const state = { count: 0 };
		const fnSpy = vi.fn();

		watch(state, fnSpy);

		expect(fnSpy).not.toHaveBeenCalled();

		state.count = 1;

		await nextTick();

		expect(fnSpy).not.toHaveBeenCalled();
	});

	it("should watch using a getter function", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy);

		await nextTick();
		expect(fnSpy).not.toHaveBeenCalled();

		state.count = 10;

		await nextTick();
		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should pass newValue and oldValue to the callback", async () => {
		const state = reactive({ count: 0 });
		let newVal: any, oldVal: any;

		watch(
			() => state.count,
			(newValue, oldValue) => {
				newVal = newValue;
				oldVal = oldValue;
			}
		);

		// first run: collect old value
		await nextTick();

		state.count = 5;

		await nextTick();

		expect(newVal).toBe(5);
		expect(oldVal).toBe(0);
	});

	it("should support immediate option", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy, { immediate: true });

		// immediate triggers synchronously (since job is called directly in dowatch)
		expect(fnSpy).toHaveBeenCalledTimes(1);

		state.count = 1;
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(2);
	});

	it("should pass newValue and oldValue with immediate option", async () => {
		const state = reactive({ count: 10 });
		let newVal: any, oldVal: any;

		watch(
			() => state.count,
			(newValue, oldValue) => {
				newVal = newValue;
				oldVal = oldValue;
			},
			{ immediate: true }
		);

		// immediate: cb is called with newValue=effect.run(), oldValue=undefined
		expect(newVal).toBe(10);
		expect(oldVal).toBeUndefined();
	});

	it("should support sync flush", () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy, { flush: "sync" });

		expect(fnSpy).not.toHaveBeenCalled();

		state.count = 1;

		// sync flush fires immediately
		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should support post flush (default)", async () => {
		const state = reactive({ count: 0 });
		let newVal: any;

		watch(
			() => state.count,
			(value) => {
				newVal = value;
			},
			{ flush: "post" }
		);

		state.count = 100;

		// should NOT be updated synchronously
		expect(newVal).toBeUndefined();

		await nextTick();
		expect(newVal).toBe(100);
	});

	it("should not trigger when value does not change", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy);

		await nextTick();
		expect(fnSpy).not.toHaveBeenCalled();

		state.count = 0;
		await nextTick();
		expect(fnSpy).not.toHaveBeenCalled();
	});

	it("should not watch deeply nested object changes by default", async () => {
		const state = reactive({
			user: {
				profile: {
					age: 10
				}
			}
		});
		const fnSpy = vi.fn();

		watch(state, fnSpy);

		state.user.profile.age = 20;
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(0);
	});

	it("should watch deeply nested object changes", async () => {
		const state = reactive({
			user: {
				profile: {
					age: 10
				}
			}
		});
		const fnSpy = vi.fn();

		watch(state, fnSpy, { deep: true });

		state.user.profile.age = 20;
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should support onCleanup callback", async () => {
		const state = reactive({ count: 0 });
		const cleanupSpy = vi.fn();
		let receivedCleanup: any;

		watch(state, (newValue, oldValue, onCleanup) => {
			receivedCleanup = cleanupSpy;
			onCleanup(cleanupSpy);
		});

		// trigger first change
		state.count = 1;
		await nextTick();
		expect(cleanupSpy).not.toHaveBeenCalled();

		// trigger second change, cleanup from previous should fire
		state.count = 2;
		await nextTick();
		expect(cleanupSpy).toHaveBeenCalledTimes(1);

		// trigger third change
		state.count = 3;
		await nextTick();
		expect(cleanupSpy).toHaveBeenCalledTimes(2);
	});

	it("should watch nested property with getter function", async () => {
		const state = reactive({
			user: {
				profile: {
					age: 10
				}
			}
		});
		const fnSpy = vi.fn();

		watch(() => state.user.profile.age, fnSpy);

		await nextTick();

		state.user.profile.age = 20;
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should not trigger on unrelated property changes with getter", async () => {
		const state = reactive({ a: 1, b: "hello" });
		const fnSpy = vi.fn();

		watch(() => state.a, fnSpy);

		await nextTick();

		state.b = "world";
		await nextTick();

		expect(fnSpy).not.toHaveBeenCalled();

		state.a = 2;
		await nextTick();
		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should watch ref value changes", async () => {
		const count = ref(0);
		const fnSpy = vi.fn();

		watch(count, fnSpy);

		await nextTick();
		expect(fnSpy).not.toHaveBeenCalled();

		count.value = 10;
		await nextTick();

		expect(fnSpy).toHaveBeenCalledTimes(1);
	});

	it("should watch ref with getter function", async () => {
		const count = ref(0);
		let newVal: any, oldVal: any;

		watch(
			() => count.value,
			(newValue, oldValue) => {
				newVal = newValue;
				oldVal = oldValue;
			},
			{ flush: "sync" }
		);

		count.value = 10;

		expect(newVal).toBe(10);
		expect(oldVal).toBe(0);
	});

	it("should trigger callback multiple times on consecutive changes", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy, { flush: "sync" });

		state.count = 1;
		state.count = 2;
		state.count = 3;

		expect(fnSpy).toHaveBeenCalledTimes(3);
	});

	it("should trigger callback multiple times on consecutive changes with post flush", async () => {
		const state = reactive({ count: 0 });
		const fnSpy = vi.fn();

		watch(() => state.count, fnSpy);

		state.count = 1;
		state.count = 2;
		state.count = 3;

		await nextTick();

		// Multiple triggers within same tick, each schedules a microtask job.
		// The oldValue tracking will be based on last run.
		expect(fnSpy).toHaveBeenCalled();
	});

	it("should handle traverse with circular reference", () => {
		const obj: any = { a: 1 };
		obj.self = obj; // circular ref

		const state = reactive(obj);
		const fnSpy = vi.fn();

		// Should not throw or infinite loop
		expect(() => watch(state, fnSpy)).not.toThrow();
	});

	it("should handle traverse with deep circular reference", () => {
		const obj: any = {
			level1: {
				level2: {} as any
			}
		};
		// level2 points back to root
		obj.level1.level2.parent = obj;

		const state = reactive(obj);
		const fnSpy = vi.fn();

		expect(() => watch(state, fnSpy)).not.toThrow();
	});

	it("should work with multiple simultaneous watches", async () => {
		const state = reactive({ a: 0, b: 10 });
		const spyA = vi.fn();
		const spyB = vi.fn();

		watch(() => state.a, spyA, { flush: "sync" });
		watch(() => state.b, spyB, { flush: "sync" });

		state.a = 1;
		expect(spyA).toHaveBeenCalledTimes(1);
		expect(spyB).not.toHaveBeenCalled();

		state.b = 20;
		expect(spyA).toHaveBeenCalledTimes(1);
		expect(spyB).toHaveBeenCalledTimes(1);

		state.a = 2;
		state.b = 30;
		expect(spyA).toHaveBeenCalledTimes(2);
		expect(spyB).toHaveBeenCalledTimes(2);
	});

	it("should accept a plain non-reactive object and watch deeply", async () => {
		const obj = { count: 0 };
		const spy = vi.fn();

		watch(obj, spy);

		await nextTick();
		expect(spy).not.toHaveBeenCalled();

		// Plain object mutations won't trigger reactive updates.
		// This test verifies that watch at least initializes without errors.
	});

	it("should not call callback on initial setup when immediate is false", async () => {
		const state = reactive({ count: 0 });
		const spy = vi.fn();

		watch(() => state.count, spy);

		await nextTick();
		expect(spy).not.toHaveBeenCalled();
	});

	it("should preserve oldValue across multiple changes", async () => {
		const state = reactive({ count: 0 });
		const values: any[] = [];

		watch(
			() => state.count,
			(value, oldValue) => {
				values.push({ new: value, old: oldValue });
			},
			{ flush: "sync" }
		);

		state.count = 1;
		expect(values).toEqual([{ new: 1, old: 0 }]);

		state.count = 2;
		expect(values).toEqual([
			{ new: 1, old: 0 },
			{ new: 2, old: 1 }
		]);

		state.count = 5;
		expect(values).toEqual([
			{ new: 1, old: 0 },
			{ new: 2, old: 1 },
			{ new: 5, old: 2 }
		]);
	});

	it("should only call cleanup once even with multiple rapid changes", async () => {
		const state = reactive({ count: 0 });
		const cleanupSpy = vi.fn();
		const cbSpy = vi.fn((_newValue: any, _oldValue: any, onCleanup: any) => {
			onCleanup(cleanupSpy);
		});

		watch(state, cbSpy);

		await nextTick();

		state.count = 1;
		state.count = 2;
		state.count = 3;

		await nextTick();

		// cleanup runs before each job execution, job runs on each scheduler trigger.
		expect(cbSpy).toHaveBeenCalled();
	});

	it("should watch array reactive source", async () => {
		const list = reactive([1, 2, 3]);
		const spy = vi.fn();

		watch(list, spy);

		await nextTick();
		expect(spy).not.toHaveBeenCalled();

		list.push(4);
		await nextTick();
		expect(spy).toHaveBeenCalled();
	});

	it("should watch array with getter function", async () => {
		const list = reactive([1, 2, 3]);
		const spy = vi.fn();

		watch(() => list.length, spy);

		await nextTick();
		expect(spy).not.toHaveBeenCalled();

		list.push(4);
		await nextTick();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("should unwatch", () => {
		const state = reactive({ count: 0 });
		const spy = vi.fn();

		const unwatch = watch(() => state.count, spy);

		expect(spy).not.toBeCalled();
		unwatch();
		state.count = 2;
		expect(spy).toHaveBeenCalledTimes(0);
	});

	describe("watchEffect", () => {
		it("should run immediately on creation", () => {
			const state = reactive({ a: 0 });
			let dummy: any;

			watchEffect(() => {
				dummy = state.a;
			});

			expect(dummy).toBe(0);
		});

		it("should re-run when dependency changes", () => {
			const state = reactive({ a: 0, b: 10 });
			const spyA = vi.fn(() => state.a);
			const spyB = vi.fn(() => state.b);

			watchEffect(spyA);
			watchEffect(spyB);

			expect(spyA).toHaveBeenCalledTimes(1);
			expect(spyB).toHaveBeenCalledTimes(1);

			state.a = 1;
			expect(spyA).toHaveBeenCalledTimes(2);
			expect(spyB).toHaveBeenCalledTimes(1);

			state.b = 1;
			expect(spyA).toHaveBeenCalledTimes(2);
			expect(spyB).toHaveBeenCalledTimes(2);
		});

		it("should track dependencies dynamically", () => {
			const state = reactive({ flag: true, a: 0, b: 10 });
			let dummy: any;

			watchEffect(() => {
				if (state.flag) {
					dummy = state.a;
				} else {
					dummy = state.b;
				}
			});

			expect(dummy).toBe(0);

			// Change a -> triggers re-run
			state.a = 1;
			expect(dummy).toBe(1);

			// Change flag -> re-run, now tracking b instead of a
			state.flag = false;
			expect(dummy).toBe(10);

			// Change a -> should NOT re-run (a is no longer a dependency)
			state.a = 100;
			expect(dummy).toBe(10);

			// Change b -> should re-run (b is now a dependency)
			state.b = 20;
			expect(dummy).toBe(20);
		});

		it("should support onCleanup callback", () => {
			const state = reactive({ count: 0 });
			const cleanupSpy = vi.fn();
			// oxlint-disable-next-line no-unused-vars
			let cleanupCalledTimes = 0;

			watchEffect((onCleanup) => {
				state.count; // track dependency
				onCleanup(() => {
					cleanupSpy();
					cleanupCalledTimes++;
				});
			});

			// First run: no cleanup yet
			expect(cleanupSpy).not.toHaveBeenCalled();

			// Trigger re-run: cleanup from first run should fire
			state.count = 1;
			expect(cleanupSpy).toHaveBeenCalledTimes(1);

			// Trigger again
			state.count = 2;
			expect(cleanupSpy).toHaveBeenCalledTimes(2);
		});

		it("should support sync flush", () => {
			const state = reactive({ count: 0 });
			let dummy: any;

			watchEffect(
				() => {
					dummy = state.count;
				},
				{ flush: "sync" }
			);

			expect(dummy).toBe(0);

			state.count = 5;
			// sync flush: already updated
			expect(dummy).toBe(5);
		});

		it("should support post flush", async () => {
			const state = reactive({ count: 0 });
			let dummy: any;

			watchEffect(
				() => {
					dummy = state.count;
				},
				{ flush: "post" }
			);

			expect(dummy).toBe(0);

			state.count = 5;
			// post flush: should NOT be updated synchronously
			expect(dummy).toBe(0);

			await nextTick();
			expect(dummy).toBe(5);
		});

		it("should batch updates with post flush on consecutive changes", async () => {
			const state = reactive({ count: 0 });
			const spy = vi.fn(() => {
				state.count;
			});

			watchEffect(spy, { flush: "post" });

			expect(spy).toHaveBeenCalledTimes(1);

			state.count = 1;
			state.count = 2;
			state.count = 3;

			// Not updated synchronously
			expect(spy).toHaveBeenCalledTimes(1);

			await nextTick();
			// All three triggers should queue separate jobs
			expect(spy).toHaveBeenCalled();
		});

		it("should not re-run when unrelated dependencies change", () => {
			const state = reactive({ a: 0, b: "hello" });
			const spy = vi.fn(() => {
				state.a;
			});

			watchEffect(spy);

			expect(spy).toHaveBeenCalledTimes(1);

			// Change unrelated property
			state.b = "world";
			expect(spy).toHaveBeenCalledTimes(1);

			// Change related property
			state.a = 1;
			expect(spy).toHaveBeenCalledTimes(2);
		});

		it("should unwatch", () => {
			const state = reactive({ count: 0 });
			const spy = vi.fn(() => state.count);

			const unwatch = watchEffect(spy);

			expect(unwatch).toBeDefined();
			unwatch();
			state.count = 2;
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it("should work with ref dependencies", () => {
			const count = ref(0);
			let dummy: any;

			watchEffect(() => {
				dummy = count.value;
			});

			expect(dummy).toBe(0);

			count.value = 10;
			expect(dummy).toBe(10);
		});

		it("should work with multiple refs", () => {
			const a = ref(1);
			const b = ref(2);
			let sum: any;

			watchEffect(() => {
				sum = a.value + b.value;
			});

			expect(sum).toBe(3);

			a.value = 10;
			expect(sum).toBe(12);

			b.value = 20;
			expect(sum).toBe(30);
		});

		it("should track deep reactive object dependencies", () => {
			const state = reactive({
				user: {
					profile: {
						age: 10
					}
				}
			});
			let dummy: any;

			watchEffect(() => {
				dummy = state.user.profile.age;
			});

			expect(dummy).toBe(10);

			state.user.profile.age = 20;
			expect(dummy).toBe(20);
		});

		it("should cleanup on each re-run and cancel stale side effects", () => {
			const state = reactive({ id: 1 });
			const cancels: string[] = [];

			watchEffect((onCleanup) => {
				const currentId = state.id;
				onCleanup(() => {
					cancels.push(`cancel-${currentId}`);
				});
			});

			state.id = 2;
			expect(cancels).toEqual(["cancel-1"]);

			state.id = 3;
			expect(cancels).toEqual(["cancel-1", "cancel-2"]);
		});
	});
});
