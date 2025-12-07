import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["vite/index.ts", "webpack/index.ts"],
    format: ["esm"],
    dts: true,
    splitting: false,
    clean: true,
    target: "esnext",
    outDir: "dist"
});

