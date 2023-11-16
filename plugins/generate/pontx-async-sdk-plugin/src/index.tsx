import { getFilesBySpecs, snippetsProvider } from "pontx-sdk-plugin-core";
import { createPontxGeneratePlugin, SnippetsProvider, PontxGeneratorPlugin } from "pontx-generate";

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider,
  getFilesBySpecs,
});

export default reactHooksGeneratePlugin;
export { getFilesBySpecs, snippetsProvider };
