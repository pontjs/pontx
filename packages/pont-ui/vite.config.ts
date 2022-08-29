import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
// import virtualHtmlPlugin from "vite-plugin-virtual-html-template";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // rollupOptions: {
    //   input: {
    //     // api: path.join(__dirname, "entry/APIDocumment"),
    //   },
    // },
  },
  plugins: [
    react(),
    // virtualHtmlPlugin({
    //   pages: {
    //     index: {
    //       template: "index.html",
    //       entry: "src/main.tsx",
    //     },
    //     api: {
    //       template: "index.html",
    //       entry: "entry/APIDocumment",
    //     },
    //     struct: {
    //       template: "index.html",
    //       entry: "entry/StructDocumment",
    //     },
    //     APIChanges: {
    //       template: "index.html",
    //       entry: "entry/APIChanges",
    //     },
    //     StructChanges: {
    //       template: "index.html",
    //       entry: "entry/StructChanges",
    //     },
    //   },
    // }),
  ],
});
