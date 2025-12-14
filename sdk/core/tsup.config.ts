import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "types/index": "src/types/index.ts",
    "features/index": "src/features/index.ts",
    "client/fetch-client": "src/client/fetch-client/index.ts",
    "client/graceful-client": "src/client/graceful-client/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: "es2020",
  outDir: "lib",
});
