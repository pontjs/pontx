import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { glob } from "glob";

const input = Object.fromEntries(
  glob
    .sync("src/**/*.ts")
    .map((file) => [file.replace(/^src\//, "").replace(/\.ts$/, ""), file])
);

export default [
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      file: "cjs/index.cjs",
      format: "cjs",
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
    external: [],
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
    external: [],
  },
];
