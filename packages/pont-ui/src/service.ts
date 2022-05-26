import { PontSpec } from "pont-spec";
// import { PontSpecDiff } from "pont-spec-diff";

/** 不同使用场景，各自注册服务来源 */
export const PontUIService = {
  /** 获取本地元数据列表 */
  requestPontSpecs: async () => {
    return [] as PontSpec[];
  },

  /** 获取 本地/远程 的diff信息 */
  requestDiffs: async () => {
    return [] as any;
  },

  /** 重新生成SDK */
  requestGenerateSdk: async (): Promise<void> => {},

  /** 重新拉取远程数据源 */
  syncRemoteSpec: async (specNames = ""): Promise<void> => {},

  /** 更新本地数据源 */
  updateSpec: async (specNames = ""): Promise<void> => {},

  /** 更新本地模块  */
  updateMod: async (modName: string, specName = ""): Promise<void> => {},

  /** 更新本地 API */
  updateAPI: async (modName: string, apiName: string, specName = ""): Promise<void> => {},

  /** 更新类 */
  updateBaseClass: async (className: string, specName = ""): Promise<void> => {},
};
