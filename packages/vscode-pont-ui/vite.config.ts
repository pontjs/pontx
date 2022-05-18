import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import htmlTemplate from "vite-plugin-html-template";

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
  build: {
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
