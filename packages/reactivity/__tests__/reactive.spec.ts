import { reactive, toRaw } from "../src/reactive";

describe("reactive", () => {
  test("Object", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    // get
    expect(observed.foo).toBe(1);
    // has
    expect("foo" in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(["foo"]);
  });

  test("existion proxy", () => {
    const original = { foo: 1 };
    const observed1 = reactive(original);
    const observed2 = reactive(observed1);

    expect(observed1).not.toBe(original);
    expect(observed2).not.toBe(original);
    expect(observed2).toBe(observed1);
  });

  test("observed value should proxy mutations to original (Object)", () => {
    const original: any = { foo: 1 };
    const observed = reactive(original);
    // set
    observed.bar = 1;
    expect(observed.bar).toBe(1);
    expect(original.bar).toBe(1);
    // delete
    delete observed.foo;
    expect("foo" in observed).toBe(false);
    expect("foo" in original).toBe(false);
  });

  // test("nested reactives", () => {
  // 	const original = {
  // 		nested: {
  // 			foo: 1
  // 		},
  // 		array: [{ bar: 2 }]
  // 	};
  // 	const observed = reactive(original);
  // 	expect(isReactive(observed.nested)).toBe(true);
  // 	expect(isReactive(observed.array)).toBe(true);
  // 	expect(isReactive(observed.array[0])).toBe(true);
  // });

  test("toRaw", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });
});
