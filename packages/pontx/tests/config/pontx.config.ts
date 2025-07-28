import { defineConfig } from "pontx";
import pontxPlugin from "./plugin";

export default defineConfig({
  outDir: "./dist",
  origins: [{ name: "pontx", url: "https://pontx.com/api/v1/pontx" }],
  plugins: [pontxPlugin],
});
