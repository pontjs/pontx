import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import process from "process";
import json from "@rollup/plugin-json";
import { glob } from "glob";
import rollupPluginGenerateDts from "../../scripts/rollupPluginGenerateDts.mjs";

const input = Object.fromEntries(
  glob
    .sync("src/**/*.ts", { ignore: "src/**/*.d.ts" })
    .map((file) => [file.replace(/^src\//, "").replace(/\.ts$/, ""), file])
);
const external = [
  "@pontx/spec",
  "lodash",
  "baidu-translate-service",
  "picocolors",
  "tslib",
  "typescript",
  "commander",
];

export default [
  // CommonJS build
  {
    input: ["src/index.ts", "src/cli.ts"],
    output: {
      dir: "cjs",
      entryFileNames: (chunkInfo) => {
        if (["index", "cli"].includes(chunkInfo.name)) {
          return "[name].cjs";
        }
        return "[name].cjs";
      },
      chunkFileNames: "[name].cjs",
      format: "cjs",
      exports: "auto",
    },
    plugins: [
      nodeResolve({
        extensions: [".ts", ".js", ".cjs"],
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: "./tsconfig.cjs.json",
        outDir: "cjs",
        declaration: false,
      }),
    ],
    external,
  },
  {
    input: ["src/index.ts", "src/cli.ts"],
    output: {
      dir: "cjs-types",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name].cjs",
      format: "cjs",
      exports: "auto",
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.cjs.json",
        outDir: "cjs-types",
        declaration: true,
        declarationDir: "cjs-types",
        declarationMap: false,
      }),
      rollupPluginGenerateDts(process.cwd()),
    ],
  },
  // ESM build
  {
    input,
    output: {
      dir: "lib",
      format: "esm",
      entryFileNames: "[name].js",
      chunkFileNames: "[name].js",
      assetFileNames: "[name].js",
      preserveModules: false,
    },
    plugins: [
      nodeResolve({
        extensions: [".ts", ".js"],
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "lib",
        outDir: "lib",
      }),
      rollupPluginGenerateDts(process.cwd()),
    ],
    external,
  },
];
