import * as _ from "lodash";
import { getCopyName, isEmptyFieldName } from "../utils";
import * as PontSpec from "pont-spec";
import { PontJsonSchema } from "pont-spec";
import { SchemaTableNode } from "./SchemaTableNode";
import { DiffResult } from "pont-spec-diff";

export type SchemaDiffNode = {
  fieldName: string;
  fieldValue: string;
  fieldType: string;
  indentCnt: number;
  order: number;
  diffType: "create" | "delete" | "update" | "equal";
};

export class PontJsonSchemaOp extends PontJsonSchema {
  static changeType(schema: PontSpec.PontJsonSchema, newType: string, $ref = ""): PontSpec.PontJsonSchema {
    if (newType === schema?.type) {
      // 除非是 map 改成 object。这种情况需要继续处理。否则直接返回
      if (!schema?.properties && newType === "object") {
      } else {
        return schema;
      }
    }

    const newSchema = {};

    if (newType === "$ref") {
      return {
        ...newSchema,
        $ref,
      } as PontSpec.PontJsonSchema;
    }

    if (newType === "map") {
      return {
        ...newSchema,
        type: "object",
      } as PontSpec.PontJsonSchema;
    }

    if (newType === "array") {
      return {
        ...newSchema,
        items: {},
        type: newType,
      } as PontSpec.PontJsonSchema;
    }

    if (newType === "object") {
      return {
        ...newSchema,
        properties: {},
        type: newType,
      } as PontSpec.PontJsonSchema;
    }

    return { ...newSchema, type: newType } as PontSpec.PontJsonSchema;
  }

  static genrateRows(
    schema: PontSpec.PontJsonSchema,
    context = {
      parentType: "root",
      prefixes: [] as any[],
      fieldName: "",
      keys: ["root"] as any[],
      orderInParent: 0 as number,
      isEndInParent: false,
      isParentMap: false,
      rootParameter: {},
    },
  ): SchemaTableNode[] {
    if (!schema) {
      return [];
    }

    const currentRow = {
      fieldName: context.fieldName,
      prefixes: context.prefixes,
      parentType: context.parentType,
      keys: context.keys,
      schema,
      orderInParent: context.orderInParent,
      isEndInParent: context.isEndInParent,
      isParentMap: context.isParentMap,
      rootParameter: context.rootParameter,
    } as SchemaTableNode;

    if (schema.$ref) {
      return [currentRow];
    }

    switch (schema.type) {
      case "boolean":
      case "number":
      case "integer":
      case "any": {
        return [currentRow];
      }
      case "string": {
        return [currentRow];
      }
      case "array": {
        return [
          currentRow,
          ...PontJsonSchemaOp.genrateRows(schema.items as PontSpec.PontJsonSchema, {
            fieldName: "",
            prefixes: [...context.prefixes, "items"],
            parentType: "array",
            keys: [...context.keys, 0],
            orderInParent: 0,
            isEndInParent: true,
            isParentMap: false,
            rootParameter: context.rootParameter,
          }),
        ];
      }
      case "object": {
        let rows = [currentRow];

        if (schema.additionalProperties && Object.keys(schema.additionalProperties).length) {
          return [
            currentRow,
            ...PontJsonSchemaOp.genrateRows(schema.additionalProperties as PontSpec.PontJsonSchema, {
              fieldName: "",
              prefixes: [...context.prefixes, "additionalProperties"],
              parentType: "object",
              keys: [...context.keys, 0],
              orderInParent: 0,
              isEndInParent: true,
              isParentMap: true,
              rootParameter: context.rootParameter,
            }),
          ];
        } else if (schema.properties && Object.keys(schema.properties).length) {
          const propList = Object.keys(schema.properties);
          let propIndex = 0;
          while (propIndex < propList.length) {
            const prop = propList[propIndex];
            const propRows = PontJsonSchemaOp.genrateRows(schema.properties[prop] as PontSpec.PontJsonSchema, {
              fieldName: prop,
              prefixes: [...context.prefixes, "properties", prop],
              parentType: "object",
              keys: [...context.keys, prop],
              orderInParent: propIndex,
              isEndInParent: propIndex === propList.length - 1,
              isParentMap: false,
              rootParameter: context.rootParameter,
            });
            rows = [...rows, ...propRows];

            propIndex++;
          }

          return rows;
        }

        return rows;
      }
    }
    if (schema.typeName) {
      return [currentRow];
    }
    return [];
  }

  static getOtherPropertiesCnt(schema: PontSpec.PontJsonSchema) {
    const allProps = Object.keys(schema);

    return allProps.filter(
      (prop) =>
        !["properties", "items", "type", "title", "required", "$ref", "format", "additionalProperties"].includes(prop),
    ).length;
  }
}
