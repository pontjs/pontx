import * as PontSpec from "pontx-spec";
export {
  InnerOriginConfig,
  PluginConfig,
  PontxFetchPlugin,
  PontxGeneratorPlugin,
  PontInnerManagerConfig,
  PontxMocksPlugin,
  PontxParserPlugin,
  PontxTransformPlugin,
  Snippet,
  PontxPlugin,
  PontxPlugins,
  PontPublicManagerConfig,
  PontxReportPlugin,
} from "./config";
export { PontManager, getSpecByName } from "./manager";
export * from "./logger";
export { PontSpec };
export { lookForFiles } from "./scan";
