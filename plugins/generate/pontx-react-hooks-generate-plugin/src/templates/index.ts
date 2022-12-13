import { SnippetsProvider } from "pontx-generate";
import { snippetsProvider as SpecsSnippetsProvider } from "./multipleSpecs/index";
export {
  apiTsCode,
  entryIndexTs,
  getRuntimeAPIMetaCode,
  specIndexTs,
  getFilesBySpecs,
  specIndexTsWithModule,
  templateWithModule,
} from "./multipleSpecs/index";

export const snippetsProvider: SnippetsProvider = (info) => {
  if (info.originName) {
  }

  return SpecsSnippetsProvider(info);
};
