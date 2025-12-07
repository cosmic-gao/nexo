import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  dts: false,
  splitting: false,
  sourcemap: true,
  target: "node18",
  shims: false
});

