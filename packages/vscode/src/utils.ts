import type { ILocation, IPosition, JsonPath } from "@stoplight/types";
import {
  getLocationForJsonPath,
  IJsonASTNode,
  parseWithPointers,
  getJsonPathForPosition,
} from "@stoplight/json";
import { PontxService, PontxManager } from "pontx";
import { PontxSpec } from "@pontx/spec";
import * as vscode from "vscode";
import { PontxTreeItem, PontxTreeItemType } from "./type";

export const getJsonPathLocation = (
  jsonCode: string,
  jsonPath: (string | number)[]
): ILocation | undefined => {
  const jsonAst = parseWithPointers(jsonCode);
  const location = getLocationForJsonPath(jsonAst, jsonPath);
  return location;
};

export const getSpecPickItems = (
  spec: PontxSpec,
  extensionUri: vscode.Uri
): vscode.QuickPickItem[] => {
  const hasMods = PontxSpec.checkHasMods(spec);
  if (hasMods) {
    const tags = PontxSpec.getTagGroups(spec);

    return tags
      .map((tag) => {
        const tagItem = {
          label: tag.name,
          description: tag.description,
          detail: `${spec.name}.${tag.name}`,
          iconPath: new vscode.ThemeIcon("folder"),
        } as vscode.QuickPickItem;

        const apiItems = Object.keys(tag.apis).map((apiName) => {
          const apiItem = tag.apis[apiName];
          const pureApiName = apiName?.includes("/")
            ? apiName.split("/")[1]
            : apiName;

          return {
            label: pureApiName,
            description:
              apiItem?.description || apiItem?.summary || apiItem?.title || "",
            detail: `${spec.name}.${tag.name}.${pureApiName}`,
            iconPath: vscode.Uri.joinPath(
              extensionUri,
              "resources/api-outline.svg"
            ),
          } as vscode.QuickPickItem;
        });

        return [tagItem, ...apiItems];
      })
      .reduce((acc, curr) => {
        return [...acc, ...curr];
      }, []);
  }

  return Object.keys(spec.apis).map((apiName) => {
    const apiItem = spec.apis[apiName];

    return {
      label: apiName,
      description:
        apiItem?.description || apiItem?.summary || apiItem?.title || "",
      detail: `${spec.name}.${apiName}`,
      iconPath: vscode.Uri.joinPath(extensionUri, "resources/api-outline.svg"),
    };
  }) as vscode.QuickPickItem[];
};

/**
 * 判断 pickItem 是否为 API 项目
 * @param pickItem 快速选择项目
 * @param manager PontxManager 实例
 * @returns 是否为 API 项目
 */
export const isApiPickItem = (
  pickItem: vscode.QuickPickItem,
  manager: PontxManager
): boolean => {
  const detailParts = pickItem?.detail?.split(".") || [];
  const [specName] = detailParts;

  // 找到对应的 spec 来判断是否有 mods
  const origin = manager?.resolvedConfig?.origins?.find(
    (o) => o.spec?.name === specName
  );
  const hasMods = origin?.spec ? PontxSpec.checkHasMods(origin.spec) : false;

  // 根据有无 mods 判断是否为 API
  return hasMods
    ? detailParts.length === 3 // 有 mods 时，API 有 3 个部分
    : detailParts.length === 2; // 无 mods 时，API 有 2 个部分
};

/**
 * 将 pickItem 转换为 PontxTreeItem
 * @param pickItem 快速选择项目
 * @param manager PontxManager 实例
 * @returns PontxTreeItem 或 null
 */
export const convertPickItemToTreeItem = (
  pickItem: vscode.QuickPickItem,
  manager: PontxManager
): PontxTreeItem | null => {
  const detailParts = pickItem.detail?.split(".") || [];
  const [specName] = detailParts;

  // 找到对应的 origin 和 API
  const origin = manager?.resolvedConfig?.origins?.find(
    (o) => o.spec?.name === specName
  );
  if (!origin) {
    return null;
  }

  let tagName: string;
  let apiName: string;

  // 构建 jsonPath 和获取 API 数据
  let jsonPath: (string | number)[];
  let api;
  if (detailParts.length === 3) {
    tagName = detailParts[1];
    apiName = detailParts[2];

    // 有 mods 的情况：${spec.name}.${tag.name}.${pureApiName}
    const apiKey = `${tagName}/${apiName}`;
    jsonPath = ["apis", apiKey];
    api = origin.spec?.apis?.[apiKey];
  } else {
    apiName = detailParts[1];
    // 无 mods 的情况：${spec.name}.${apiName}
    jsonPath = ["apis", apiName];
    api = origin.spec?.apis?.[apiName];
  }

  if (!api) {
    return null;
  }

  // 获取 components.schemas（参考 explorer 的实现）
  const componentsSchemas = origin.spec?.components?.schemas;
  const dataWithComponents = componentsSchemas
    ? {
        ...api,
        components: {
          schemas: componentsSchemas,
        },
      }
    : api;

  return {
    type: PontxTreeItemType.API,
    name: apiName,
    jsonPath,
    specName,
    data: dataWithComponents,
  };
};

/**
 * 生成示例代码
 * @param pickItem 快速选择项目
 * @param sampleType 示例类型
 * @param manager PontxManager 实例
 * @returns 生成的代码或 null
 */
export const generateSampleCode = async (
  pickItem: vscode.QuickPickItem,
  sampleType: string,
  manager: PontxManager
): Promise<string | null> => {
  const detailParts = pickItem.detail?.split(".") || [];
  const [specName] = detailParts;
  let tagName: string;
  let apiName: string;

  const origin = manager?.resolvedConfig?.origins?.find(
    (o) => o.spec?.name === specName
  );
  if (!origin) {
    return null;
  }

  if (detailParts.length === 3) {
    tagName = detailParts[1];
    apiName = detailParts[2];
  } else {
    apiName = detailParts[1];
  }

  // 获取 API 信息
  const api =
    origin?.spec?.apis?.[
      tagName && apiName ? `${tagName}/${apiName}` : apiName
    ] || origin?.spec?.apis?.[apiName];

  if (!api) {
    return null;
  }

  // 获取 generateSamples
  const generateSamples =
    (await manager?.resolvedConfig?.resolvedPlugin?.generateSamples?.({
      resolvedConfig: manager.resolvedConfig,
    })) || [];

  // 找到对应的 sample 对象
  const sample = generateSamples.find((s) => s.case === sampleType);
  if (!sample) {
    return null;
  }

  // 调用 generateSample 方法
  return await sample.generateSample({
    specName: specName,
    tagName: tagName || "",
    apiName: apiName,
  });
};
