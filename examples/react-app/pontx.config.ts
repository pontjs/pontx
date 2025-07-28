import { defineConfig } from "pontx";

export default defineConfig({
  outDir: "./src/services",
  origins: [
    {
      url: "https://petstore.swagger.io/v2/swagger.json",
      name: "petstore",
    },
  ],
});
