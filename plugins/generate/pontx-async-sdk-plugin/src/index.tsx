import { getFilesBySpecs, snippetsProvider } from "pontx-generate";
import { createPontxGeneratePlugin, SnippetsProvider, PontxGeneratorPlugin } from "pontx-generate";

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider,
  getFilesBySpecs,
});

export default reactHooksGeneratePlugin;
export { getFilesBySpecs, snippetsProvider };
