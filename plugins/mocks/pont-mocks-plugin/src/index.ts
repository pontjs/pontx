// export { FileGenerator, FileStructure } from "./FileGenerator";
// export { CodeGenerator as CodeGenerator, indentation } from "./CodeGenerator";
// export { Snippet } from "./Snippet";
import { PontAPI, PontJsonSchema, PontSpec } from "pont-spec";
import * as _ from "lodash";

class PontJsonSchemaMocksOptions {
  templateArgs: PontJsonSchema[] = [];
  depth = 3;
  definitions: { [key: string]: PontJsonSchema } = {};
}

export class PontJsonSchemaMocks {
  /**
   * 生成 mocks 数据
   * @param schema PontJsonSchema
   * @param depth mocks 数据生成时，根据结构递归数据的层数
   */
  static toMocks(schema: PontJsonSchema, options = new PontJsonSchemaMocksOptions()) {
    if (typeof schema.templateIndex === "number" && schema.templateIndex !== -1) {
      if (options.templateArgs[schema.templateIndex]) {
        return PontJsonSchemaMocks.toMocks(options.templateArgs[schema.templateIndex], {
          ...options,
          depth: options.depth - 1,
          templateArgs: [],
        });
      }
    }
    if (schema.typeName) {
      if (options.definitions[schema.typeName]) {
        return PontJsonSchemaMocks.toMocks(options.definitions[schema.typeName], {
          ...options,
          depth: options.depth - 1,
          templateArgs: schema.templateArgs,
        });
      }
    }
    if (schema.example) {
      return schema.example;
    } else if (schema.examples?.length) {
      return schema.examples[0];
    } else if (schema.enum?.length) {
      return schema.enum[0];
    }

    switch (schema.type) {
      case "boolean": {
        return Math.random() > 0.5 ? true : false;
      }
      case "string": {
        return "string";
      }
      case "number": {
        if (schema.format === "int32" || schema.format === "int64") {
          return Number.parseInt(Math.random() * 100 + "");
        }
        return (Math.random() * 100).toFixed(3);
      }
      case "array": {
        return [
          PontJsonSchemaMocks.toMocks(schema.items, {
            ...options,
            depth: options.depth - 1,
          }),
        ];
      }
      case "object": {
        if (schema.properties) {
          return _.mapValues(schema.properties, (property) => {
            return PontJsonSchemaMocks.toMocks(property, {
              ...options,
              depth: options.depth - 1,
            });
          });
        } else if (schema.additionalProperties) {
          return {
            ["testField1"]: PontJsonSchemaMocks.toMocks(schema.additionalProperties, {
              ...options,
              depth: options.depth - 1,
            }),
            ["testField2"]: PontJsonSchemaMocks.toMocks(schema.additionalProperties, {
              ...options,
              depth: options.depth - 1,
            }),
          };
        }
      }
    }
    return null;
  }
}

export class InterfaceMocks {
  static toMocks(api: PontAPI, options = new PontJsonSchemaMocksOptions()) {
    const mocksData = PontJsonSchemaMocks.toMocks(api.responses?.[200]?.schema);
  }
}
