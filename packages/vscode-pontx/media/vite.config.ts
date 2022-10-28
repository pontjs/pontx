import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "",
  resolve: {
    alias: {
      react: path.join(__dirname, "../../../node_modules/react"),
      "react-dom": path.join(__dirname, "../../../node_modules/react-dom"),
    },
  },
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
