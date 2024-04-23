import _ from "lodash";
import { CoreSchemaMetaSchema } from "oas-spec-ts";

export type PontJsonSchemaArray = PontJsonSchema[];
export interface PontJsonSchemaMap {
  [key: string]: PontJsonSchema;
}

export interface PontJsonSchema extends CoreSchemaMetaSchema {}
/**
 * pont 中的数据类型，集成 JSONSchema。
 * 支持泛型类、泛型表达式、判断是否为业务数据结构。
 */

export class PontJsonSchema {
  // isDefsType?: boolean;
  /**
   * 仅在数据结构子结构中定义。
   * -1 表示非泛型类型，泛型类型生成代码时为 T0, T1, T2, T3...
   */
  templateIndex? = -1;

  /** 从 $ref 中解析出的数据结构引用名 */
  typeName?: string;

  /**
   * 两种含义：
   * 1、泛型表达式参数列表, 从 $ref 中解析出的泛型表达式
   * 2、支持嵌套，例如 Pagination<List<Array<Biz>>, number | string>
   */
  templateArgs?: PontJsonSchema[] = [];

  example?: string;

  required?: string[];

  requiredProps?: string[];

  items?: PontJsonSchema | PontJsonSchemaArray;
  additionalProperties?: PontJsonSchema;
  properties?: PontJsonSchemaMap;

  externalDocs?: {
    url?: string;
    description?: string;
  };

  ext?: any;

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
      let defName = schema.isDefsType ? `defs.${schema.typeName}` : schema.typeName;
      if (!defName) {
        defName = schema.type as string;
      }

      if (schema.templateArgs?.length) {
        if (defName === "array") {
          defName = "Array";
        }
        return `${defName}<${schema.templateArgs.map((arg) => PontJsonSchema.toString(arg)).join(", ")}>`;
      }
      return defName;
    }

    switch (schema?.typeName || schema.type) {
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

    if (schema.$ref) {
      return schema.$ref.split("/").pop();
    }

    return schema?.typeName || "any";
  }

  static create() {
    return { type: "string" } as PontJsonSchema;
  }

  static checkIsMap(schema: PontJsonSchema) {
    if (schema?.type === "object" && schema.additionalProperties) {
      return true;
    }
    return false;
  }

  static getDescription(schema: PontJsonSchema) {}

  static mapPontxSchema(schema: PontJsonSchema, mapper: (schema: PontJsonSchema) => PontJsonSchema) {
    if (!schema) {
      return schema;
    }

    const newSchema = mapper(schema);
    if (newSchema.type === "object" && newSchema?.properties) {
      const newProperties = Object.keys(newSchema.properties).reduce((result, key) => {
        const newPropValue = PontJsonSchema.mapPontxSchema(mapper(newSchema.properties[key]), mapper);
        if (newPropValue) {
          return {
            ...result,
            [key]: newPropValue,
          };
        }
        return result;
      }, {});

      return {
        ...newSchema,
        properties: newProperties,
      };
    }
    if (newSchema.type === "array" && newSchema?.items) {
      return {
        ...newSchema,
        items: PontJsonSchema.mapPontxSchema(mapper(newSchema.items), mapper),
      };
    }
    if (newSchema.type === "object" && newSchema?.additionalProperties) {
      return {
        ...newSchema,
        additionalProperties: PontJsonSchema.mapPontxSchema(mapper(newSchema.additionalProperties), mapper),
      };
    }
    return newSchema;
  }

  static getUsedStructNames(schema: PontJsonSchema) {
    const usedStructs: string[] = [];
    const mapPontxSchema = (schema: PontJsonSchema) => {
      if (schema.$ref) {
        const structName = schema.$ref.split("/").pop();
        usedStructs.push(structName);
      }
      return schema;
    };
    PontJsonSchema.mapPontxSchema(schema, mapPontxSchema);
    return _.union(usedStructs);
  }

  static parseFromSample(json): PontJsonSchema {
    const type = typeof json;

    switch (type) {
      case "boolean": {
        return {
          type: "boolean",
        };
      }
      case "number": {
        const isInteger = Number.isInteger(json);
        if (isInteger) {
          return {
            type: "integer",
          } as PontJsonSchema;
        }
        return {
          type: "number",
        } as PontJsonSchema;
      }
      case "string": {
        return {
          type: "string",
        } as PontJsonSchema;
      }
      case "object": {
        if (Array.isArray(json)) {
          return {
            type: "array",
            items: PontJsonSchema.parseFromSample(json[0]),
          } as PontJsonSchema;
        }

        const keys = Object.keys(json);
        const properties = keys.reduce((result, key) => {
          const propSchema = PontJsonSchema.parseFromSample(json[key]);
          return {
            ...result,
            [key]: propSchema,
          };
        }, {});
        return {
          type: "object",
          properties,
        };
      }
    }

    return {};
  }

  static merge(schema: PontJsonSchema, newSchema: PontJsonSchema) {
    if (!schema) {
      return newSchema;
    }
    if (!newSchema) {
      return schema;
    }
    if (schema.type !== newSchema.type) {
      return newSchema;
    }
    if (schema.type === "object") {
      if (schema.properties && newSchema.properties) {
        const allKeys = _.union(Object.keys(schema.properties), Object.keys(newSchema.properties));
        const properties = allKeys.reduce((result, key) => {
          const propSchema = PontJsonSchema.merge(schema.properties[key], newSchema.properties[key]);
          return {
            ...result,
            [key]: propSchema,
          };
        }, {});
        return {
          ...schema,
          properties,
        };
      }
      if (newSchema.properties) {
        return newSchema;
      }
      if (schema.properties) {
        return schema;
      }
      return newSchema;
    }
    if (schema.type === "array") {
      if (schema.items && newSchema.items) {
        return {
          ...schema,
          items: PontJsonSchema.merge(schema.items as PontJsonSchema, newSchema.items as PontJsonSchema),
        };
      }
      if (newSchema.items) {
        return newSchema;
      }
      if (schema.items) {
        return schema;
      }
      return newSchema;
    }
    if (schema.type === "string") {
      if (schema.enum && newSchema.enum) {
        return {
          ...schema,
          enum: _.union(schema.enum, newSchema.enum),
        };
      }
      return {
        ...schema,
        ...newSchema,
      };
    }

    return {
      ...schema,
      ...newSchema,
    };
  }
}
