import _ from "lodash";
import { PontSpec, WithoutModsName } from "./type";

export class SpecDiffTree {
  definitions: DiffItem[] = [];
  controllers: DiffItem[] = [];
  apis: DiffItem[] = [];
  specDiff?: DiffItem;
  name: string;
  diffType: "created" | "deleted" | "updated";
}

export class DiffItem {
  type: "api" | "struct" | "dir" | "specInfo" | "spec" | "controller";
  name: string;
  diffType: "created" | "deleted" | "updated";
  pre?: any;
  new?: any;
  /** 仅当 type = spec 时存在 */
  diffItems?: DiffItem[];

  static checkHasDefinitionsUpdate(diffItem: DiffItem) {
    if (diffItem.type !== "spec") {
      return false;
    }
    if (!diffItem) {
      return false;
    }

    if (diffItem.diffType === "updated") {
      const hasStructsUpdate = (diffItem.diffItems || []).some((item) => {
        return item.type === "struct";
      });
      return hasStructsUpdate;
    }

    return false;
  }

  static getControllerDiffItems(diffItem: DiffItem, controllerName: string) {
    if (diffItem.type !== "spec") {
      return [];
    }
    if (!diffItem) {
      return [];
    }

    if (diffItem.diffType === "updated") {
      return (diffItem.diffItems || []).filter((item) => {
        return (
          (item?.type === "dir" && item?.name === controllerName) ||
          (item.type === "api" && item.name?.split?.("/")?.[0] === controllerName)
        );
      });
    }

    return [];
  }

  static getSpecDiffCnt(specDiffTree: SpecDiffTree) {
    if (!specDiffTree) {
      return 0;
    }

    if (specDiffTree.diffType === "created" || specDiffTree.diffType === "deleted") {
      return 1;
    }
    if (specDiffTree.diffType === "updated") {
      const hasStructsUpdate = (specDiffTree.definitions || []).length > 0;
      // 数据结构的是否更新，统计为 1。
      const structDiffCnt = hasStructsUpdate ? 1 : 0;

      // API 分组更新个数
      const dirCnt = specDiffTree.controllers?.length || 0;

			const apiCnt = specDiffTree.apis?.length || 0;

      return dirCnt + structDiffCnt + apiCnt;
    }

    return 0;
  }

  static getDiffCnt(diffItems: DiffItem[]) {}

  static getSpecDiffTree(diffItems: DiffItem[], specName: string) {
    const specDiff = diffItems.find((item) => item.type === "specInfo");
    const result = new SpecDiffTree();

    result.name = specName;
    result.diffType = "updated";

    result.definitions = diffItems.filter((item) => item.type === "struct");
    if (specDiff) {
      result.specDiff = specDiff;
    }

    result.apis = (diffItems || []).filter((diffItem) => {
      if (diffItem?.type === "api") {
        if (!diffItem?.name?.includes?.("/")) {
          return true;
        }
      }
      return false;
    });

    const groups = _.groupBy(diffItems, (item) => {
      if (item.type === "api") {
        if (item.name?.includes("/")) {
          return item.name.split("/")[0];
        }
      } else if (item.type === "dir") {
        return item.name;
      }

      return "";
    });
    result.controllers = Object.keys(groups)
      .filter((id) => id)
      .map((key) => {
        const items = groups[key];
        const dirItem = items.find((item) => item.type === "dir");
        const apiItems = items.filter((item) => item.type === "api");

        const controller = {
          type: "controller",
          name: key,
          diffItems: apiItems || [],
          diffType: dirItem?.diffType || "updated",
        } as DiffItem;

        return controller;
      });

    return result;
  }
}
