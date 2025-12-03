import { Plugin, ResolvedOriginConfig } from "pontx";

export default {
  name: "pontx-plugin",
  fetch: async (originName: string, originConfig: ResolvedOriginConfig) => {
    return "";
  },
  transformAfterFetch: async (metaStr: string, specName: string) => {
    return metaStr;
  },
};
