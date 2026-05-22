import { defineConfig } from "vitest/config";
import codspeedPlugin from "@codspeed/vitest-plugin";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  plugins: [codspeedPlugin()],
  resolve: {
    alias: [
      {
        find: /@mini-vue\/([\w-]*)/,
        replacement: path.resolve(__dirname, "packages") + "/$1/src",
      },
    ],
  },
});
