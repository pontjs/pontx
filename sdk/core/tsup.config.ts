import { defineConfig } from "tsup";

export default defineConfig([
  // 打包 src 到 lib
  {
    entry: {
      index: "src/index.ts",
      "core/index": "src/core/index.ts",
      "types/index": "src/types/index.ts",
      "features/index": "src/features/index.ts",
      "graceful-client/index": "src/graceful-client/index.ts",
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
  },
  // 打包 plugin-src 到 plugin
  {
    entry: {
      index: "plugin-src/index.ts",
      plugin: "plugin-src/plugin.ts",
      "generate-apis": "plugin-src/generate-apis.ts",
      "generate-api-meta": "plugin-src/generate-api-meta.ts",
      types: "plugin-src/types.ts",
      "write-files": "plugin-src/write-files.ts",
    },
    format: ["esm", "cjs"],
    dts: {
      resolve: true, // 解析外部依赖的类型
    },
    splitting: false,
    sourcemap: true,
    clean: false, // 不清理，避免删除 lib 目录
    treeshake: true,
    minify: false,
    target: "es2020",
    outDir: "plugin",
    external: ["pontx", "@pontx/spec"], // 标记为外部依赖
    noExternal: [], // 确保外部依赖不被打包
  },
]);
