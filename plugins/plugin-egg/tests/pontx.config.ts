import { defineConfig, Plugin } from "pontx";
import { promises as fsp } from "fs";
import * as YAML from "js-yaml";
import type { OAS3 } from "oas-spec-ts";
import { pontxEggPlugin } from "@pontx/sdk-plugin-egg";

const yamlPlugin = {
  name: "yaml-oas3",
  fetch: async (url, options) => {
    const content = await fsp.readFile(
      options.originConfig?.localPath!,
      "utf-8"
    );
    const oas3: OAS3.OpenAPIObject = YAML.load(content);

    Object.keys(oas3.paths!).forEach((path) => {
      const apis = oas3.paths![path];

      Object.keys(apis).forEach((method) => {
        const api = apis[method] as OAS3.OperationObject;

        if (api.operationId?.includes("_")) {
          api.operationId = api.operationId.split("_").pop();
        }
      });
    });

    return JSON.stringify(oas3);
  },
} as Plugin;

export default defineConfig({
  plugins: [yamlPlugin, pontxEggPlugin()],
  outDir: "./services",
  origins: [{ name: "apiMeta", localPath: "./openapi.yaml" }],
});
