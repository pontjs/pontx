import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // htmlTemplate({
    //   pagesDir: "./",
    //   pages: {
    //     index: {
    //       template: "./index.html",
    //     },
    //   },
    //   data: { cspSource: "" },
    // }),
  ],
  root: "",
  build: {
    // minify: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  css: {},
});
