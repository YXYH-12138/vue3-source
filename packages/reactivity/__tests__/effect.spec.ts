import { reactive } from "../src/reactive";
import { effect } from "../src/effect";
import { vi } from "vitest";

describe("effect", () => {
  it("should run the passed function once (wrapped by a effect)", () => {
    const fnSpy = vi.fn(() => {});
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it("should observe list", () => {
    const list = reactive([1]);
    const fnSpy = vi.fn(() => {
      list.join(",");
    });
    effect(fnSpy);
    list[2] = 20;
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  it("should hanlde nested effects", () => {
    const counter = reactive({ age: 0 });
    const fnSpy = vi.fn(() => {});
    effect(() => {
      effect(() => {});
      counter.age;
      fnSpy();
    });

    counter.age++;
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  it("should clean up the dependencies", () => {
    const state = reactive({ age: 0, name: "jack", flag: true, f1: 0, f2: 2 });
    const fnSpy = vi.fn();

    const runner = effect(() => {
      if (state.flag) {
        state.age;
        state.f1;
        state.f2;
      } else {
        state.name;
      }
      fnSpy();
    });
    expect(runner.effect.deps.length).toBe(4);

    // 初始执行一次
    expect(fnSpy).toHaveBeenCalledTimes(1);

    state.flag = false;

    // 切换 flag，应该触发一次
    expect(fnSpy).toHaveBeenCalledTimes(2);

    expect(runner.effect.deps.length).toBe(2);

    state.age = 2;

    // ❗ age 不再被追踪，不应再触发
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  it("should observe basic properties", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });

  it("should observe multiple properties", () => {
    let dummy;
    const counter = reactive({ num1: 0, num2: 0 });
    const runner = effect(
      () => (dummy = counter.num1 + counter.num1 + counter.num2)
    );

    expect(dummy).toBe(0);
    expect(runner.effect.deps.length).toBe(2);
    counter.num1 = counter.num2 = 7;
    expect(dummy).toBe(21);
  });

  it("should handle multiple effects", () => {
    let dummy1, dummy2;
    const counter = reactive({ num: 0 });
    effect(() => (dummy1 = counter.num));
    effect(() => (dummy2 = counter.num));

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  it("should observe nested properties", () => {
    let dummy;
    const counter = reactive({ nested: { num: 0 } });
    effect(() => (dummy = counter.nested.num));

    expect(dummy).toBe(0);
    counter.nested.num = 8;
    expect(dummy).toBe(8);
  });

  it("should observe function call chains", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    expect(dummy).toBe(0);
    counter.num = 2;
    expect(dummy).toBe(2);
  });

  it("scheduler", () => {
    let dummy;
    let run: any;
    const scheduler = vi.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { schedule: scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  // it("events: onStop", () => {
  // 	const onStop = vi.fn();
  // 	const runner = effect(() => {}, {
  // 		onStop
  // 	});

  // 	stop(runner);
  // 	expect(onStop).toHaveBeenCalled();
  // });
});
