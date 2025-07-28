import _ from "lodash";
const { map, mapValues, unionBy } = _;
import { compileTemplate } from "./compiler.js";
import { PontxJsonSchema } from "../schema.js";
import { parseOAS2Ast2PontJsonSchema, parseOAS2JsonSchema } from "./schema.js";
import { OAS2 } from "oas-spec-ts";
import { PrimitiveTypeMap, unionSchemas } from "./utils.js";

export function parseOAS2Schemas(swagger: OAS2.SwaggerObject) {
  // 解析 name 中带有的 genericTypeParameters
  const schemaNameAsts = _.map(
    swagger?.definitions || {},
    (schema, schemaName) => {
      const schemaNameAst = compileTemplate(schemaName, "#/definitions/");

      if (!schemaNameAst) {
        throw new Error("compiler error in schemaName: " + schemaName);
      }

      return {
        name: schemaNameAst.name || schemaName,
        schemaNameAst: schemaNameAst,
        schema: schema as PontxJsonSchema,
      };
    }
  );
  const schemaNames = schemaNameAsts.map((schemaNameAst) => schemaNameAst.name);

  let baseClasses = schemaNameAsts
    .map((astItem) => {
      const astSchema = parseOAS2Ast2PontJsonSchema(astItem.schemaNameAst, {
        classTemplateArgCodes: [],
        schemaNames,
        isSchemaNameAst: true,
      });
      if (
        astSchema.type === "generic" &&
        astSchema?.genericTypeParameters?.length
      ) {
        return {
          name: astItem.name,
          schema: {
            ...astItem.schema,
            genericTypeParameters: astSchema.genericTypeParameters,
          } as PontxJsonSchema,
        };
      }

      return {
        name: astItem.name,
        schema: astItem.schema,
      };
    })
    .map((item) => {
      item.schema = parseOAS2JsonSchema(item.schema, {
        schemaNames,
        classTemplateArgCodes:
          item.schema.genericTypeParameters?.map((param) => {
            if (typeof param === "string") {
              // 不可能发生，此处只会返回对象类型。此处仅解决类型问题。
              return param;
            }

            return PontxJsonSchema.toString(param.default);
          }) || [],
        isSchemaNameAst: false,
      });
      if (PrimitiveTypeMap[item?.schema?.type]) {
        item.schema = {
          ...item.schema,
          ...PrimitiveTypeMap[item?.schema?.type],
        };
      }
      item.schema = PontxJsonSchema.mapPontxSchema(item.schema, (struct) => {
        if (PrimitiveTypeMap[struct?.type]) {
          return {
            ...struct,
            ...PrimitiveTypeMap[struct?.type],
          };
        }

        return struct;
      });

      item.schema = PontxJsonSchema.mapSchemaRequiredToArray(item.schema);

      return item;
    });

  // todo 删除重复的，但是保留泛型最多的
  return unionSchemas(baseClasses);
}
