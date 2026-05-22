import { reactive } from "../src/reactive";
import { effect } from "../src/effect";
import { bench } from "vitest";

describe("effect", () => {
  bench("effect(100)", () => {
    const obj = reactive({ count: 0 });

    for (let i = 0; i < 100; i++) {
      effect(() => {
        obj.count;
      });
    }

    obj.count++;
  });
});
