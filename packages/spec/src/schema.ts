import { checkNeedQuotationMark } from "./generate/utils.js";
import _ from "lodash";

export type SimpleTypes =
  | "array"
  | "boolean"
  | "integer"
  | "number"
  | "object"
  | "string"
  | "generic";

export interface JsonSchemaMap {
  [key: string]: JsonSchema;
}

/** 元数据属性 */
export interface MetadataSchema {
  /** JSON Schema 的唯一标识符 */
  $id?: string;
  /** 指定使用的 JSON Schema 版本 */
  $schema?: string;
  /** 引用其他 JSON Schema 的 URI */
  $ref?: string;
  /** 面向开发者的技术性注释，用于添加开发过程中的说明和注意事项，不会在 UI 中显示 */
  $comment?: string;
  /** 面向用户的简短描述，用于 UI 展示，应该简洁明了便于用户理解 */
  title?: string;
  /** Schema 的详细描述 */
  description?: string;
  /** 默认值 */
  default?: any;
  /** 是否只读 */
  readOnly?: boolean;
  /** 示例值列表 */
  examples?: any[];
}

/** 数值验证属性 */
export interface NumericValidationSchema {
  /** 数值必须能被该值整除 */
  multipleOf?: number;
  /** 数值的最大值（包含） */
  maximum?: number;
  /** 数值的最大值（不包含） */
  exclusiveMaximum?: number;
  /** 数值的最小值（包含） */
  minimum?: number;
  /** 数值的最小值（不包含） */
  exclusiveMinimum?: number;
}

/** 字符串验证属性 */
export interface StringValidationSchema {
  /** 字符串的最大长度 */
  maxLength?: number;
  /** 字符串的最小长度，默认为0 */
  minLength?: number;
  /** 字符串必须匹配的正则表达式 */
  pattern?: string;
  /** 数据格式 */
  format?: string;
  /** 内容的媒体类型 */
  contentMediaType?: string;
  /** 内容的编码方式 */
  contentEncoding?: string;
}

/** 数组验证属性 */
export interface ArrayValidationSchema {
  /** 数组的最大长度 */
  maxItems?: number;
  /** 数组的最小长度，默认为0 */
  minItems?: number;
  /** 数组元素是否必须唯一，设置为 true 时数组中的所有元素必须是唯一的，不能有重复值 */
  uniqueItems?: boolean;
  /** 数组必须包含至少一个匹配该 schema 的元素 */
  contains?: JsonSchema;
  /** 数组额外元素的 schema，设置为 false 表示不允许额外元素，设置为 true 或 schema 对象表示允许额外元素且必须符合指定的 schema */
  additionalItems?: JsonSchema;
}

/** 对象验证属性 */
export interface ObjectValidationSchema {
  /** 对象属性的最大数量 */
  maxProperties?: number;
  /** 对象属性的最小数量，默认为0 */
  minProperties?: number;
  /** 对象属性名匹配正则表达式的属性对应的 schema */
  patternProperties?: JsonSchemaMap;
  /** 对象属性的依赖关系 */
  dependencies?: {
    [k: string]: JsonSchema | string[];
  };
  /** 对象属性名的 schema */
  propertyNames?: JsonSchema;
}

/** 条件验证属性 */
export interface ConditionalValidationSchema {
  /** 条件验证：如果条件为真 */
  if?: JsonSchema;
  /** 条件验证：那么必须满足该 schema */
  then?: JsonSchema;
  /** 条件验证：否则必须满足该 schema */
  else?: JsonSchema;
}

/** 组合验证属性 */
export interface CombinatorialValidationSchema {
  /** 必须满足所有 schema */
  allOf?: JsonSchema[];
  /** 必须满足任意一个 schema */
  anyOf?: JsonSchema[];
  /** 必须满足且只能满足一个 schema */
  oneOf?: JsonSchema[];
  /** 不能匹配该 schema */
  not?: JsonSchema;
}

/** 基础类型定义 */
export interface TypeDefinitionSchema {
  /** 数据类型 */
  type?: SimpleTypes | SimpleTypes[];
  /** 必须等于该值 */
  const?: any;
  /** 枚举值列表 */
  enum?: any[];
}

/** JSONSchema 核心元数据 */
export interface CoreSchemaMetaSchema
  extends MetadataSchema,
    NumericValidationSchema,
    StringValidationSchema,
    ArrayValidationSchema,
    ObjectValidationSchema,
    ConditionalValidationSchema,
    CombinatorialValidationSchema,
    TypeDefinitionSchema {
  /** 模板参数数量 */
  templateArgsCnt?: number;
  [k: string]: any;
}

export interface JsonSchema extends CoreSchemaMetaSchema {
  /** 必填的属性名列表 */
  required?: string[];
  /** 数组元素的 schema */
  items?: JsonSchema | JsonSchema[];
  /** 是否允许额外属性，设置为 false 表示不允许额外属性，设置为 true 或 schema 对象表示允许额外属性且必须符合指定的 schema */
  additionalProperties?: JsonSchema;
  /** 在 JSON Schema Draft-04 中用于定义可重用的子 schema 列表，在 Draft-07 中被 $defs 替代，在 OpenAPI 3.0 中被 components/schemas 替代 */
  definitions?: JsonSchemaMap;
  /** 对象属性的 schema 列表 */
  properties?: JsonSchemaMap;
}

export type PontxTypeDefinitionSchema = Pick<
  TypeDefinitionSchema,
  "const" | "enum"
> & {
  type: SimpleTypes;
};

export type PontxMetadataSchema = Pick<
  MetadataSchema,
  "$ref" | "title" | "description" | "default" | "examples"
>;

export type PontxJsonSchemaMap = {
  [key: string]: PontxJsonSchema;
};

export interface PontxCoreSchemaMetaSchema
  extends PontxMetadataSchema,
    NumericValidationSchema,
    StringValidationSchema,
    ArrayValidationSchema,
    PontxTypeDefinitionSchema {}

export type PontxGenericTypeParameter =
  | string
  | {
      name: string;
      default?: PontxJsonSchema;
    };

export interface ExternalDocumentationObject {
  description?: string; // 文档的简短描述
  url: string; // 文档的 URL（在 OAS 2.0 中是必需的，在 OAS 3.0 中是可选的）
}

/**
 * 定义泛型
 *  * 定义泛型类的泛型参数  genericTypeParameters
 *  * 泛型类属性使用泛型参数 typeArguments
 * 使用泛型 genericRef
 */

/** 使用泛型类来表达类型，引用已经定义的泛型类型 */
export interface GenericRef {
  /** 引用泛型参数的名称，在子属性中使用，如 T0 */
  name?: string;
  /** 引用泛型类型的 schema */
  $ref?: string;
  /** 引用泛型类型时，传入泛型参数类型。泛型参数类型 */
  typeArguments?: PontxJsonSchema[];
}

export interface PontxJsonSchema extends PontxCoreSchemaMetaSchema {
  /** 所有分支均需满足。 */
  allOf?: PontxJsonSchema[];
  /** 至少满足一个分支。 */
  anyOf?: PontxJsonSchema[];
  /** 只满足一个分支。 */
  oneOf?: PontxJsonSchema[];
  /** 必填的属性名列表 */
  required?: string[];
  /** 数组元素的 schema */
  items?: PontxJsonSchema;
  /** 是否允许额外属性，设置为 false 表示不允许额外属性，设置为 true 或 schema 对象表示允许额外属性且必须符合指定的 schema */
  additionalProperties?: PontxJsonSchema;
  /** 对象属性的 schema 列表 */
  properties?: PontxJsonSchemaMap;
  /** 泛型类型引用 */
  genericRef?: GenericRef;
  /** 定义泛型类的泛型参数 */
  genericTypeParameters?: PontxGenericTypeParameter[];
  /**
   * 
  // 在类属性中使用泛型参数，如 class Grade<T0> { student: T0 }; 
  // 那么 student 的 genericTypeParameterRef 为 { type: 'generic', genericTypeParameterRef: T0  }
   */
  /** 泛型类型参数引用 */
  genericTypeParameterRef?: string;
  /** 外部文档 */
  externalDocs?: ExternalDocumentationObject;
  /** 枚举值标题，key 为枚举值，value 为枚举值的标题 */
  enumValueTitles?: Record<string, string>;
  /** 扩展属性 */
  ext?: any;
}

/** 遍历访问选项 */
type TraverseVisitOptions = {
  /** 数据路径 */
  dataPath: string[];
  /** schema 路径 */
  schemaPath: string[];
};

/**
 * 遍历访问器
 * @param schema 当前 schema
 * @param options 遍历访问选项，包含当前遍历中的数据路径和 schema 路径
 */
export type TraverseVisitor = (
  schema: PontxJsonSchema,
  options: TraverseVisitOptions
) => void;

export class PontxJsonSchema {
  /** 生成 TS 类型表达式 */
  static toString(schema: PontxJsonSchema, schemaPrefix = "") {
    if (!schema) {
      return "any";
    }

    if (schema.enum?.length) {
      return schema.enum
        .map((el) => (typeof el === "string" ? `'${el}'` : el))
        .join(" | ");
    }

    const genericNameMap = {
      array: "Array",
    };

    if (schema.type === "generic" && schema?.genericRef) {
      let genericName = schema?.genericRef.name;
      if (schema?.genericRef.$ref && !genericName) {
        const refName = schema?.genericRef.$ref.split("/").pop();
        genericName = schemaPrefix + refName;
      } else if (genericNameMap[genericName]) {
        genericName = genericNameMap[genericName];
      }

      if (schema?.genericRef.typeArguments?.length) {
        const typeArguments = schema?.genericRef.typeArguments
          .map((arg) => PontxJsonSchema.toString(arg, schemaPrefix))
          .join(", ");
        return `${genericName}<${typeArguments}>`;
      }

      return genericName;
    } else if (schema.type === "generic" && schema.genericTypeParameterRef) {
      return schema.genericTypeParameterRef;
    }

    // 非标准类型处理
    let schemaType = schema.type;
    if (schema.type === ("long" as SimpleTypes)) {
      schemaType = "number";
    } else if (schema.type === ("Array" as SimpleTypes)) {
      schemaType = "array";
    }

    switch (schemaType) {
      case "boolean": {
        return "boolean";
      }
      case "integer": {
        return "number";
      }
      case "number": {
        return "number";
      }
      case "string": {
        return "string";
      }
      case "array": {
        if (schema.items) {
          return `Array<${PontxJsonSchema.toString(
            schema.items as PontxJsonSchema,
            schemaPrefix
          )}>`;
        }

        return "[]";
      }
      case "object": {
        if (schema?.properties) {
          return `{ ${Object.keys(schema.properties)
            .map((propName) => {
              const needQuotation = checkNeedQuotationMark(propName);
              return `${
                needQuotation ? `'${propName}'` : propName
              }: ${PontxJsonSchema.toString(
                schema.properties[propName],
                schemaPrefix
              )}`;
            })
            .join("; ")} }`;
        }
        if (schema?.additionalProperties) {
          return `Record<any, ${PontxJsonSchema.toString(
            schema?.additionalProperties as PontxJsonSchema,
            schemaPrefix
          )}>`;
        }
      }
    }

    if (schema.$ref) {
      return schemaPrefix + schema.$ref.split("/").pop();
    }

    return "any";
  }

  static create() {
    return { type: "string" } as PontxJsonSchema;
  }

  static checkIsMap(schema: PontxJsonSchema) {
    if (schema?.type === "object" && schema.additionalProperties) {
      return true;
    }
    return false;
  }

  /**
   * 遍历子 schema 并进行映射，返回新的 schema
   * @param schema 根 schema
   * @param mapper 映射函数
   * @param traverseNewSchema 是否遍历新生成的 schema
   * @returns 映射后的 schema
   */
  static mapPontxSchema(
    schema: PontxJsonSchema,
    mapper: (schema: PontxJsonSchema) => PontxJsonSchema,
    traverseNewSchema = true
  ) {
    if (!schema) {
      return schema;
    }

    const mappedSchema = mapper(schema);
    const newSchema = traverseNewSchema ? mappedSchema : schema;

    if (newSchema?.type === "object" && newSchema?.properties) {
      const newProperties = Object.keys(newSchema.properties).reduce(
        (result, key) => {
          // mapper 生成的数据结构可能不一样，也需要进行一次 mapper，进行递归处理。
          const newPropValue = PontxJsonSchema.mapPontxSchema(
            newSchema.properties[key],
            mapper,
            traverseNewSchema
          );

          if (newPropValue) {
            return {
              ...result,
              [key]: newPropValue,
            };
          }
          return result;
        },
        {}
      );

      return {
        ...mappedSchema,
        properties: newProperties,
      };
    }

    if (newSchema?.type === "array" && newSchema?.items) {
      return {
        ...mappedSchema,
        items: PontxJsonSchema.mapPontxSchema(
          newSchema.items,
          mapper,
          traverseNewSchema
        ),
      };
    }

    if (newSchema?.type === "object" && newSchema?.additionalProperties) {
      return {
        ...mappedSchema,
        additionalProperties: PontxJsonSchema.mapPontxSchema(
          newSchema.additionalProperties,
          mapper,
          traverseNewSchema
        ),
      };
    }

    return mappedSchema;
  }

  /**
   * 根据 JSON Path 获取子 schema
   * @param schema 根 schema
   * @param jsonPaths JSONPath
   * @param rootSchema 整份的 schema，可以获取到 $ref 的 schema
   * @returns 子 schema
   */
  static getSchemaByJsonPaths = (
    schema: PontxJsonSchema,
    jsonPaths: string[],
    rootSchema = schema
  ) => {
    if (!schema) {
      return schema;
    }

    if (schema?.$ref) {
      if (schema?.$ref?.startsWith("#/")) {
        const schemaPaths = schema?.$ref?.slice(2)?.split("/");
        let refSchema = _.get(rootSchema, schemaPaths);

        return PontxJsonSchema.getSchemaByJsonPaths(
          refSchema,
          jsonPaths,
          rootSchema
        );
      }
    }

    if (!jsonPaths?.length) {
      return schema;
    }
    const [currentPath, ...restPaths] = jsonPaths;

    if (schema?.type === "object" && schema?.properties) {
      if (schema?.properties?.[currentPath]) {
        return PontxJsonSchema.getSchemaByJsonPaths(
          schema.properties[currentPath],
          restPaths,
          rootSchema
        );
      }
    }
    if (schema?.type === "array" && schema?.items) {
      return PontxJsonSchema.getSchemaByJsonPaths(
        schema.items,
        restPaths,
        rootSchema
      );
    }
    if (schema?.type === "object" && schema?.additionalProperties) {
      return PontxJsonSchema.getSchemaByJsonPaths(
        schema.additionalProperties,
        restPaths,
        rootSchema
      );
    }

    throw new Error(
      `currentPath and schema is invalid: ${currentPath}, ${schema}, ${rootSchema}`
    );
  };

  /**
   * 遍历 schema
   * @param schema 根 schema
   * @param visitor 访问器
   */
  static traversePontxSchema(
    schema: PontxJsonSchema,
    visitor: TraverseVisitor,
    options: TraverseVisitOptions = {
      dataPath: [],
      schemaPath: [],
    }
  ) {
    visitor(schema, options);

    if (schema.type === "object" && schema?.properties) {
      Object.keys(schema.properties).forEach((key) => {
        const newOptions = {
          dataPath: [...options.dataPath, key],
          schemaPath: [...options.schemaPath, "properties", key],
        } as TraverseVisitOptions;
        PontxJsonSchema.traversePontxSchema(
          schema.properties[key],
          visitor,
          newOptions
        );
      });
    }
    if (schema.type === "array" && schema?.items) {
      const newOptions = {
        dataPath: [...options.dataPath, "*"],
        schemaPath: [...options.schemaPath, "items"],
      } as TraverseVisitOptions;
      PontxJsonSchema.traversePontxSchema(schema.items, visitor, newOptions);
    }
    if (schema.type === "object" && schema?.additionalProperties) {
      const newOptions = {
        dataPath: [...options.dataPath, "*"],
        schemaPath: [...options.schemaPath, "additionalProperties"],
      } as TraverseVisitOptions;
      PontxJsonSchema.traversePontxSchema(
        schema.additionalProperties,
        visitor,
        newOptions
      );
    }
  }

  static mapSchemaRequiredToArray(schema: PontxJsonSchema) {
    return PontxJsonSchema.mapPontxSchema(
      schema,
      (struct) => {
        if (struct.type === "object" && struct.properties) {
          if (typeof struct.required === "boolean" || !struct.required) {
            const required = Object.keys(struct.properties).filter((key) => {
              if (typeof struct.properties[key]?.required === "boolean") {
                return struct.properties[key].required;
              }
              return false;
            });
            return {
              ...struct,
              required,
            };
          }
          return struct;
        }
        return struct;
      },
      false
    );
  }

  /**
   * 获取 schema 中引用的结构体名称集合
   * @param schema 根 schema
   * @returns 引用的结构体名称列表
   */
  static getUsedStructNames(schema: PontxJsonSchema) {
    const usedStructs: string[] = [];

    PontxJsonSchema.traversePontxSchema(schema, (struct: PontxJsonSchema) => {
      if (struct.$ref) {
        const structName = struct.$ref.split("/").pop();
        usedStructs.push(structName);
      }
    });

    return _.union(usedStructs);
  }

  /**
   * 从样本数据推导 schema
   * @param json 样本数据
   * @returns 推导后的 schema
   */
  static parseFromSample(json): PontxJsonSchema {
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
          } as PontxJsonSchema;
        }
        return {
          type: "number",
        } as PontxJsonSchema;
      }
      case "string": {
        return {
          type: "string",
        } as PontxJsonSchema;
      }
      case "object": {
        if (Array.isArray(json)) {
          return {
            type: "array",
            items: PontxJsonSchema.parseFromSample(json[0]),
          } as PontxJsonSchema;
        }

        const keys = Object.keys(json);
        const properties = keys.reduce((result, key) => {
          const propSchema = PontxJsonSchema.parseFromSample(json[key]);
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

    return null;
  }

  /**
   * 合并 schema
   * @param schema 原始 schema
   * @param newSchema 新 schema
   * @returns 合并后的 schema
   */
  static merge(schema: PontxJsonSchema, newSchema: PontxJsonSchema) {
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
        const allKeys = _.union(
          Object.keys(schema.properties),
          Object.keys(newSchema.properties)
        );
        const properties = allKeys.reduce((result, key) => {
          const propSchema = PontxJsonSchema.merge(
            schema.properties[key],
            newSchema.properties[key]
          );
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
          items: PontxJsonSchema.merge(
            schema.items as PontxJsonSchema,
            newSchema.items as PontxJsonSchema
          ),
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

  /**
   * 检查属性是否必填
   * @param schema 根 schema
   * @param propName 属性名
   * @returns 是否必填
   */
  static checkRequired(schema: PontxJsonSchema, propName: string) {
    if (schema?.required) {
      if (schema.required?.includes?.(propName)) {
        return true;
      }
    } else if (schema.type === "object" && schema.properties?.[propName]) {
      return !!schema.properties?.[propName]?.required;
    }

    return false;
  }
}
