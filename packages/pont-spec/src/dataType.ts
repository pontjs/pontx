import { JsonSchema } from "oas-spec-ts";

export interface PontJsonSchema extends JsonSchema {}
/**
 * pont 中的数据类型，集成 JSONSchema。
 * 支持泛型类、泛型表达式、判断是否为业务数据结构。
 */
export class PontJsonSchema {
  isDefsType?: boolean;
  /** -1 表示非泛型类型，泛型类型生成代码时为 T1, T2, T3... */
  templateIndex? = -1;
  /** 泛型表达式参数列表，支持嵌套，例如 Pagination<List<Array<Biz>>, number | string> */
  templateArgs?: PontJsonSchema[] = [];
  /** 被拆解出来的类名、处理后的怪异类型等 */
  typeName: string;

  /** 生成表达式，用于预览读取类型信息 */
  static toString(schema: PontJsonSchema) {
    if (!schema) {
      return "any";
    }
    if (typeof schema?.templateIndex === "number" && schema?.templateIndex !== -1) {
      return `T${schema.templateIndex}`;
    }

    if (schema.enum?.length) {
      return schema.enum.map((el) => (typeof el === "string" ? `'${el}'` : el)).join(" | ");
    }

    if (schema.templateArgs?.length) {
      const defName = schema.isDefsType ? `defs.${schema.typeName}` : schema.typeName;
      if (schema.templateArgs?.length) {
        return `${defName}<${schema.templateArgs.map((arg) => PontJsonSchema.toString(arg)).join(", ")}>`;
      }
      return defName;
    }

    switch (schema?.typeName) {
      case "long":
      case "integer": {
        return "number";
      }
      case "file": {
        return "File";
      }
      case "Array":
      case "array": {
        if (schema.items) {
          return `Array<${PontJsonSchema.toString(schema.items as PontJsonSchema)}>`;
        }

        return "[]";
      }
      case "object": {
        if (schema?.properties) {
          return `{ ${Object.keys(schema.properties)
            .map((propName) => {
              return `${propName}: ${PontJsonSchema.toString(schema.properties?.[propName] as PontJsonSchema)}`;
            })
            .join("; ")} }`;
        }
        if (schema?.additionalProperties) {
          return `map<string, ${PontJsonSchema.toString(schema?.additionalProperties as PontJsonSchema)}>`;
        }
      }
    }

    return schema?.typeName || "any";
  }

  static create() {
    return { type: "string" } as PontJsonSchema;
  }

  static checkIsMap(schema: PontJsonSchema) {
    if (schema?.type === "object" && !schema.properties) {
      return true;
    }
    return false;
  }

  static getDescription(schema: PontJsonSchema) {}
}
