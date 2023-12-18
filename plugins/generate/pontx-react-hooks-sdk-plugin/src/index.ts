import { getFilesBySpecs, snippetsProvider } from "pontx-generate";
import { createPontxGeneratePlugin, SnippetsProvider, rootCoreTs, GetFilesBySpecs } from "pontx-generate";

const mySnippetsProvider: SnippetsProvider = (info) => {
  const defaultSnippets = snippetsProvider(info);
  const assignModule = info.controllerName ? `.${info.controllerName}` : "";

  if (info.api.method?.toUpperCase() === "GET") {
    defaultSnippets.push({
      name: "useRequest",
      code: `const { data, isLoading, error, mutate } = API.${info.originName}${assignModule}.${info.api.name}.useRequest({  })`,
    });
  }

  return defaultSnippets;
};

const REQUEST_METHODS_TYPE_CODE = `
import type { RequestMethods } from "pontx-hooks-sdk";
`;

const myFilesGenerator: GetFilesBySpecs = async (origins) => {
  const SdkMethodsFn = `import { SdkMethodsFn } from "pontx-hooks-sdk";\n`;

  const result = await getFilesBySpecs(origins, REQUEST_METHODS_TYPE_CODE);
  result["core.ts"] = rootCoreTs(origins, SdkMethodsFn);
  return result;
};

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider: mySnippetsProvider,
  getFilesBySpecs: myFilesGenerator,
});

export default reactHooksGeneratePlugin;
export { getFilesBySpecs, snippetsProvider };
