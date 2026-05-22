import { reactive } from "../src/reactive";
import { effect } from "../src/effect";
import { bench } from "vitest";

// name               hz     min      max    mean     p75      p99     p995     p999     rme  samples
// · effect(10000)  115.98  6.4772  14.5169  8.6225  9.6918  14.5169  14.5169  14.5169  ±5.06%       59

describe("effect", () => {
  bench("effect(10000)", () => {
    const obj = reactive({ count: 0 });

    for (let i = 0; i < 10000; i++) {
      effect(() => {
        obj.count;
      });
    }

    obj.count++;
  });
});
