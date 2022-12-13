import { snippetsProvider, getFilesBySpecs } from "./templates";
import { createPontxGeneratePlugin, SnippetsProvider, PontxGeneratorPlugin } from "pontx-generate";
export {
  apiTsCode,
  entryIndexTs,
  getRuntimeAPIMetaCode,
  snippetsProvider,
  specIndexTs,
  specIndexTsWithModule,
  getFilesBySpecs,
  templateWithModule,
} from "./templates/index";
export { getBuiltinStructure } from "./templates/utils";

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider,
  getFilesBySpecs,
});

export default reactHooksGeneratePlugin;
