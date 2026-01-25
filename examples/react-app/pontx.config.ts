import { defineConfig } from "pontx";

export default defineConfig({
  outDir: "./src/services",
  specs: [
    {
      url: "https://petstore.swagger.io/v2/swagger.json",
      name: "petstore",
    },
  ],
});
