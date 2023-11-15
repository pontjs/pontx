import { getFilesBySpecs } from "./getFilesBySpecs";
import { createPontxGeneratePlugin, SnippetsProvider, PontxGeneratorPlugin } from "pontx-generate";
import { snippetsProvider } from "./snippetsProvider";

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider,
  getFilesBySpecs,
});

export default reactHooksGeneratePlugin;
