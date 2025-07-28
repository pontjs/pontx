import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { glob } from "glob";
import rollupPluginGenerateDts from "../../scripts/rollupPluginGenerateDts.mjs";
import process from "process";

const input = Object.fromEntries(
  glob
    .sync("src/**/*.ts")
    .map((file) => [file.replace(/^src\//, "").replace(/\.ts$/, ""), file])
);

const external = ["immer", "lodash", "oas-spec-ts"];

export default [
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      dir: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name].cjs",
      format: "cjs",
      exports: "auto",
    },
    plugins: [
      nodeResolve({
        extensions: [".ts", ".js", ".cjs"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.cjs.json",
        declaration: false,
      }),
    ],
    external,
  },
  {
    input: "src/index.ts",
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
        declarationMap: false,
      }),
      rollupPluginGenerateDts(process.cwd()),
    ],
    external,
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
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
      }),
    ],
    external,
  },
];
