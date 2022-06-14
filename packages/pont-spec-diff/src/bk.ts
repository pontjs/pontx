import * as _ from "lodash";
import * as PontSpec from "pont-spec";

export enum DiffSchemaType {
  PontSpec = "PontSpec",
  Mod = "Mod",
  BaseClass = "BaseClass",
  Interface = "Interface",
  Parameter = "Parameter",
  Responses = "Responses",
  Response = "Response",
  Struct = "Struct",
}

/** 对比结果中的叶子节点 */
type DiffDetail<Schema> = {
  diffType: "detail";
  preSchema?: Schema;
  nextSchema?: Schema;
  /** schema 类型，用于定制生成 Diff 信息或渲染方式 */
  schemaType: DiffSchemaType;
  /** 相对于 SchemaType 的相对路径 */
  schemaJsonPath?: string;
  /** schema 名称、ID，对比列表时需要记录 */
  name?: string;
};

type ListDiff<Schema> = {
  diffType: "list";
  /** schema 类型，用于定制生成 Diff 信息或渲染方式 */
  schemaType: DiffSchemaType;
  diffs: Diffs;
};

type MapDiff<Schema> = {
  diffType: "map";
  preSchema?: Schema;
  nextSchema?: Schema;
  schemaType: DiffSchemaType;
  diffs: Diffs;
};

type UnResolvedDiff<Schema> = {
  preSchema?: Schema;
  nextSchema?: Schema;
  schemaType: DiffSchemaType;
  diffType?: string;
  /** 相对于 SchemaType 的相对路径 */
  schemaJsonPath?: string;
};

type DiffItem<T> = DiffDetail<T> | ListDiff<T> | MapDiff<T>;

export class Diffs {
  creates: Array<DiffItem<any>>;
  updates: Array<DiffItem<any>>;
  deletes: Array<DiffItem<any>>;
}

export function diffList<Schema>(diffItem: UnResolvedDiff<Schema[]>, diffId: string): Diffs {
  const { schemaType, nextSchema, preSchema } = diffItem;
  const creates = _.differenceBy(nextSchema, preSchema, diffId).map((schema) => {
    return {
      diffType: "detail",
      nextSchema: schema,
      name: schema[diffId],
      schemaType,
    };
  });
  const deletes = _.differenceBy(preSchema, nextSchema, diffId).map((schema) => {
    return {
      diffType: "detail",
      preSchema: schema,
      name: schema[diffId],
      schemaType,
    };
  });
  const updates = _.intersectionBy(preSchema, nextSchema, diffId)
    .map((schema) => {
      if (_.isEqual(preSchema, nextSchema)) {
        return null;
      }
      return getDiffMethod({
        name: schema[diffId],
        preSchema: (preSchema || []).find((item) => item[diffId] === schema[diffId]),
        nextSchema: (nextSchema || []).find((item) => item[diffId] === schema[diffId]),
        schemaType,
      } as any);
    })
    .filter((item: ListDiff<any>) => {
      if (!item) {
        return false;
      }
      const { updates, creates, deletes } = item?.diffs || {};
      return updates?.length || creates?.length || deletes?.length;
    });

  const diffs = {} as Diffs;
  if (creates?.length) {
    diffs.creates = creates as any;
  }
  if (updates?.length) {
    diffs.updates = updates as any;
  }
  if (deletes?.length) {
    diffs.deletes = deletes as any;
  }

  if (Object.keys(diffs)?.length) {
    return diffs;
  }
  return null;
}

export function diffMap<Schema extends Object>(
  diffItem: UnResolvedDiff<Schema>,
  getDiffContent: (
    diffItem: UnResolvedDiff<any>,
    key: string,
    type: "create" | "delete" | "update",
  ) => DiffItem<any> = _.identity,
): MapDiff<Schema> {
  const { nextSchema, preSchema, schemaType, ...rest } = diffItem;
  const newSchemaKeys = Object.keys(nextSchema || {});
  const preSchemaKeys = Object.keys(preSchema || {});
  const creates = [] as DiffItem<any>[];
  const updates = [] as DiffItem<any>[];
  const deletes = [] as DiffItem<any>[];

  newSchemaKeys.forEach((key) => {
    if (nextSchema[key] && !preSchema[key]) {
      creates.push(
        getDiffContent(
          {
            nextSchema: nextSchema[key],
            schemaJsonPath: key,
            schemaType,
            diffType: "detail",
          } as UnResolvedDiff<any>,
          key,
          "create",
        ),
      );
    }
    if (nextSchema[key] && preSchema[key] && !_.isEqual(nextSchema[key], preSchema[key])) {
      const updateDiff = getDiffContent(
        {
          diffType: "detail",
          preSchema: preSchema[key],
          nextSchema: nextSchema[key],
          schemaJsonPath: key,
          schemaType,
        },
        key,
        "update",
      );
      if (updateDiff && (updateDiff as any).diffs) {
        updates.push(updateDiff);
      }
    }
  });

  preSchemaKeys.forEach((key) => {
    if (preSchema[key] && !nextSchema[key]) {
      deletes.push(
        getDiffContent(
          {
            diffType: "detail",
            preSchema: preSchema[key],
            schemaType,
            schemaJsonPath: key,
          },
          key,
          "delete",
        ),
      );
    }
  });

  if (creates?.length || updates?.length || deletes?.length) {
    const diffs = {
      creates,
      updates,
      deletes,
    };
    return {
      ...rest,
      diffType: "map",
      diffs,
      schemaType: diffItem.schemaType,
    };
  }

  return null;
}

type DiffConfigure<Schema> = {
  [key in keyof Schema]?: (
    diffItem: UnResolvedDiff<Schema[key]>,
    type: "create" | "update" | "delete",
  ) => DiffItem<Schema[key]>;
};

const MY_DIFF_CONFIGURE: {
  [key in DiffSchemaType]?: DiffConfigure<any>;
} = {
  [DiffSchemaType.PontSpec]: {
    mods: (diffItem, type) => {
      const { preSchema, nextSchema, ...rest } = diffItem;
      return {
        ...rest,
        diffType: "list",
        diffs: diffList({ ...diffItem, schemaType: DiffSchemaType.Mod }, "name"),
        schemaType: DiffSchemaType.Mod,
      } as ListDiff<PontSpec.Mod>;
    },
  } as DiffConfigure<PontSpec.PontSpec>,
  [DiffSchemaType.Mod]: {
    interfaces: (diffItem, type) => {
      const { preSchema, nextSchema, ...rest } = diffItem;
      return {
        ...rest,
        diffType: "list",
        diffs: diffList({ ...diffItem, schemaType: DiffSchemaType.Interface }, "name"),
        schemaType: DiffSchemaType.Interface,
      } as ListDiff<PontSpec.Interface>;
    },
  },
  [DiffSchemaType.Interface]: {
    parameters: (diffItem, type) => {
      const { preSchema, nextSchema, ...rest } = diffItem;
      return {
        ...rest,
        diffType: "list",
        diffs: diffList({ ...diffItem, schemaType: DiffSchemaType.Parameter }, "name"),
        schemaType: DiffSchemaType.Parameter,
      } as ListDiff<any>;
    },
    responses: (diffItem, type) => {
      return diffMap({ ...diffItem }, (responseDiff, code, type) => {
        return getDiffMethod({ ...responseDiff, schemaType: DiffSchemaType.Response });
      });
    },
  } as DiffConfigure<PontSpec.Interface>,
  [DiffSchemaType.Parameter]: {
    schema: (diffItem) => {
      return diffMap({ ...diffItem, schemaType: DiffSchemaType.Struct });
    },
  } as DiffConfigure<PontSpec.Parameter>,
  [DiffSchemaType.Response]: {
    schema: (diffItem) => {
      return diffMap({ ...diffItem, schemaType: DiffSchemaType.Struct });
    },
  },
};

export const getDiffMethod = <T>(diffItem: UnResolvedDiff<T>): DiffItem<T> => {
  const customDiffMethods = MY_DIFF_CONFIGURE[diffItem.schemaType] as DiffConfigure<any>;

  return diffMap(diffItem, (subDiffItem, key, type) => {
    if (customDiffMethods[key]) {
      if (type === "update") {
        return customDiffMethods[key](subDiffItem, type);
      }
      return subDiffItem as any;
    }

    return subDiffItem as any;
  });
};
