import * as _ from "lodash";
import * as PontSpec from "pont-spec";
import { immutableSet, immutableUpdate } from "../../../utils/utils";
import { copyParameter, getCopyName, getEmptyFieldName } from "../utils";

export type TableRowActionType =
  | "MoveUp"
  | "MoveDown"
  | "Delete"
  | "Duplicate"
  | "ChangeSchema"
  | "ChangeName"
  | "Plus"
  | "Folded"
  | "UnFolded";

export type TableRowAction =
  | {
      type: "ChangeName";
      payload: string;
    }
  | {
      type: "MoveUp" | "MoveDown" | "Delete" | "Duplicate" | "Plus" | "Folded" | "UnFolded";
    }
  | {
      type: "ChangeSchema";
      payload: (schema: PontSpec.PontJsonSchema) => PontSpec.PontJsonSchema;
    }
  | {
      type: "ChangeParam";
      payload: {
        field: string;
        value: string;
        name?: string;
      };
    };

export class SchemaTableContext {
  tableType: "parameters" | "response" | "struct";
  visibleRows: SchemaTableNode[] = [];
  foldedRows: any[][];
  readOnly = false;
  onSchemaRowAction: (row: SchemaTableNode, action: TableRowAction) => any;
}

export class ActionContext {
  tableType: "parameters" | "response" | "struct";
  foldedRows: any[][];
  changeFoldedRows(foldedRows: any[][]) {}
  scrollToRowKeys(rowKyes: string[]) {}
  changeRootApiSchema: (schemaChanger: Function) => any;
  changeResponseBody: (bodyChanger: (newBody: PontSpec.PontJsonSchema) => PontSpec.PontJsonSchema) => any;
}

export class SchemaTableNode {
  /** schema 路径 */
  prefixes = [] as any[];
  schema = { type: "string" } as PontSpec.PontJsonSchema;
  fieldName: string = getEmptyFieldName();
  keys = [] as any[];
  parentType: "object" | "array" | "root" = "root";
  orderInParent = 0;
  isEndInParent = false;
  isParentMap = false;
  rootParameter?: PontSpec.Parameter;

  static checkShouldPlusSystem(row: SchemaTableNode, context: { tableType: string }) {
    const { schema, parentType, isParentMap } = row;
    const { tableType } = context;

    if (tableType === "parameters" || tableType === "struct") {
      if (["object"].includes(schema.type as string)) {
        return true;
      }
    }
    return false;
  }

  static changeSchema(
    rowPrefixes: string[],
    actionContext: ActionContext,
    schemaChanger: (schema: PontSpec.PontJsonSchema) => PontSpec.PontJsonSchema,
  ) {
    if (actionContext.tableType === "parameters") {
      return actionContext.changeRootApiSchema(immutableUpdate(["parameters", ...rowPrefixes], schemaChanger));
    } else if (actionContext.tableType === "response") {
      return actionContext.changeResponseBody(immutableUpdate(rowPrefixes, schemaChanger));
    }
  }

  static changeName(row: SchemaTableNode, actionContext: ActionContext, fieldName: string) {
    if (actionContext.tableType === "parameters") {
      const [paramIndex, ...rowPrefixes] = row.prefixes;

      if (row.keys.length === 1) {
        return actionContext.changeRootApiSchema(
          immutableUpdate(["parameters", paramIndex], (param) => {
            return {
              ...param,
              name: fieldName,
            };
          }),
        );
      }
    }

    const headPrefixes = row.prefixes.slice(0, row.prefixes.length - 1);
    return SchemaTableNode.changeSchema(headPrefixes, actionContext, (properties: any) => {
      return Object.keys(properties).reduce((obj, key) => {
        if (key === row.fieldName) {
          return { ...obj, [fieldName]: properties[key] };
        }
        return { ...obj, [key]: properties[key] };
      }, {}) as any;
    });
  }

  static delete(row: SchemaTableNode, actionContext: ActionContext) {
    if (actionContext.tableType === "parameters") {
      if (row.keys.length === 1) {
        const [paramIndex] = row.prefixes;
        return actionContext.changeRootApiSchema(
          immutableUpdate([`parameters`], (params) => params.filter((param, index) => index !== paramIndex)),
        );
      }
    }
    const headPrefixes = row.prefixes.slice(0, row.prefixes.length - 1);
    const lastPrefix = row.prefixes[row.prefixes.length - 1];

    return SchemaTableNode.changeSchema(headPrefixes, actionContext, (schema) => {
      const schemaCopy = { ...schema };
      delete schemaCopy[lastPrefix];
      return schemaCopy;
    });
  }

  static plusChild(row: SchemaTableNode, actionContext: ActionContext) {
    if (row.schema?.type === "array") {
      SchemaTableNode.changeSchema([...row.prefixes, "items"], actionContext, (schema) => {
        return PontSpec.PontJsonSchema.create();
      });
      actionContext.scrollToRowKeys([...row.keys, "0"]);
      return;
    } else if (PontSpec.PontJsonSchema.checkIsMap(row.schema)) {
      SchemaTableNode.changeSchema([...row.prefixes, "additionalProperties"], actionContext, (schema) => {
        return PontSpec.PontJsonSchema.create();
      });
      return;
    }

    const emptyFieldName = getEmptyFieldName();
    SchemaTableNode.changeSchema([...row.prefixes, "properties", emptyFieldName], actionContext, (schema) => {
      return PontSpec.PontJsonSchema.create();
    });
    actionContext.scrollToRowKeys([...row.keys, emptyFieldName]);
  }

  static duplicate(row: SchemaTableNode, actionContext: ActionContext) {
    if (actionContext.tableType === "parameters") {
      const [paramIndex, ...rowPrefixes] = row.prefixes;

      if (row.keys.length === 1) {
        return actionContext.changeRootApiSchema(
          immutableUpdate(["parameters"], (params) => {
            return copyParameter(params, paramIndex);
          }),
        );
      }
    }
    // 父级不可能为数组
    // 父级为对象时
    const headPrefixes = row.prefixes.slice(0, row.prefixes.length - 1);
    return SchemaTableNode.changeSchema(headPrefixes, actionContext, (properties: any) => {
      return Object.keys(properties).reduce((obj, key) => {
        if (key === row.fieldName) {
          const copyName = getCopyName(Object.keys(properties), key);
          return { ...obj, [row.fieldName]: properties[key], [copyName]: properties[key] };
        }
        return { ...obj, [key]: properties[key] };
      }, {}) as any;
    });
    // map 的情况暂不考虑
  }

  static fold(row: SchemaTableNode, actionContext: ActionContext) {
    return actionContext.changeFoldedRows([...actionContext.foldedRows, row.keys]);
  }

  static unfold(row: SchemaTableNode, actionContext: ActionContext) {
    const foundIndex = actionContext.foldedRows.findIndex((rowKeys) => {
      return rowKeys.every((key, keyIndex) => row.keys[keyIndex] === key);
    });
    if (foundIndex !== -1) {
      return actionContext.changeFoldedRows(actionContext.foldedRows.filter((__, index) => index !== foundIndex));
    }
  }

  static moveUp(row: SchemaTableNode, actionContext: ActionContext) {
    if (actionContext.tableType === "parameters") {
      const [paramIndex, ...rowPrefixes] = row.prefixes;

      if (row.keys.length === 1) {
        if (paramIndex === 0) {
          return;
        }

        return actionContext.changeRootApiSchema(
          immutableUpdate(["parameters"], (params: PontSpec.Parameter[]) => {
            return [
              ...params.slice(0, paramIndex - 1),
              params[paramIndex],
              params[paramIndex - 1],
              ...params.slice(paramIndex + 1),
            ];
          }),
        );
      }
    }
    // 父级不可能为数组
    // 父级为对象时
    const headPrefixes = row.prefixes.slice(0, row.prefixes.length - 1);
    return SchemaTableNode.changeSchema(headPrefixes, actionContext, (properties: any) => {
      const keys = Object.keys(properties);
      const keyIndex = keys.findIndex((key) => key === row.fieldName);
      if (keyIndex === -1) {
        return properties;
      }

      return keys.reduce((obj, key) => {
        if (key === keys[keyIndex - 1]) {
          return { ...obj, [row.fieldName]: properties[row.fieldName] };
        } else if (key === row.fieldName) {
          return { ...obj, [keys[keyIndex - 1]]: properties[keys[keyIndex - 1]] };
        }
        return { ...obj, [key]: properties[key] };
      }, {}) as any;
    });
  }

  static moveDown(row: SchemaTableNode, actionContext: ActionContext) {
    if (actionContext.tableType === "parameters") {
      const [paramIndex, ...rowPrefixes] = row.prefixes;

      if (row.keys.length === 1) {
        return actionContext.changeRootApiSchema(
          immutableUpdate(["parameters"], (params: PontSpec.Parameter[]) => {
            if (paramIndex === params.length - 1) {
              return params;
            }

            return [
              ...params.slice(0, paramIndex),
              params[paramIndex + 1],
              params[paramIndex],
              ...params.slice(paramIndex + 2),
            ];
          }),
        );
      }
    }
    // 父级不可能为数组
    // 父级为对象时
    const headPrefixes = row.prefixes.slice(0, row.prefixes.length - 1);
    return SchemaTableNode.changeSchema(headPrefixes, actionContext, (properties: any) => {
      const keys = Object.keys(properties);
      const keyIndex = keys.findIndex((key) => key === row.fieldName);
      if (keyIndex === keys.length - 1) {
        return properties;
      }

      return keys.reduce((obj, key) => {
        if (key === row.fieldName) {
          return { ...obj, [keys[keyIndex + 1]]: properties[keys[keyIndex + 1]] };
        } else if (key === keys[keyIndex + 1]) {
          return { ...obj, [row.fieldName]: properties[row.fieldName] };
        }
        return { ...obj, [key]: properties[key] };
      }, {}) as any;
    });
  }

  static changeParam(row: SchemaTableNode, actionContext: ActionContext, { field, value, name }: any) {
    if (actionContext.tableType === "parameters") {
      const [paramIndex, ...rowPrefixes] = row.prefixes;

      if (name) {
        actionContext.changeRootApiSchema(
          immutableUpdate([`parameters`, paramIndex], (param) => {
            return {
              ...param,
              name,
              [field]: value,
            };
          }),
        );
      } else {
        actionContext.changeRootApiSchema(immutableSet(["parameters", paramIndex, field], value));
      }
    }
  }

  static plusSystemParams(
    row: SchemaTableNode,
    actionContext: ActionContext,
    params: { name: string; schema: any; in: string }[],
  ) {
    SchemaTableNode.changeSchema([...row.prefixes, "properties"], actionContext, (properties: any) => {
      return params.reduce((result, param) => {
        return {
          ...result,
          [param.name]: {
            ...(param.schema || {}),
            bizType: param.in,
          },
        };
      }, properties || {});
    });
  }

  static handleSchemaRowAction(action: TableRowAction, row: SchemaTableNode, actionContext: ActionContext) {
    switch (action.type) {
      case "ChangeSchema": {
        return SchemaTableNode.changeSchema(row.prefixes, actionContext, action.payload);
      }
      case "ChangeName": {
        return SchemaTableNode.changeName(row, actionContext, action.payload);
      }
      case "Delete": {
        return SchemaTableNode.delete(row, actionContext);
      }
      case "Plus": {
        return SchemaTableNode.plusChild(row, actionContext);
      }
      case "Duplicate": {
        return SchemaTableNode.duplicate(row, actionContext);
      }
      case "Folded": {
        return SchemaTableNode.fold(row, actionContext);
      }
      case "UnFolded": {
        return SchemaTableNode.unfold(row, actionContext);
      }
      case "MoveUp": {
        return SchemaTableNode.moveUp(row, actionContext);
      }
      case "MoveDown": {
        return SchemaTableNode.moveDown(row, actionContext);
      }
      case "ChangeParam": {
        return SchemaTableNode.changeParam(row, actionContext, action.payload);
      }
    }
  }
}
