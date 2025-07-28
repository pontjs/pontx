import { OAS2 } from "oas-spec-ts";
import { AstNode, compileTemplate } from "./compiler.js";
import { PRIMITIVE_TYPES, PrimitiveTypeMap } from "./utils.js";
import { GenericRef, PontxJsonSchema } from "../schema.js";

export interface OAS2JsonSchemaContext {
  schemaNames: string[];
  /** 类泛型表达式代码 */
  classTemplateArgCodes: string[];
  /** 是否是数据结构名称的 AST，如果是，则需要将泛型参数转换为 genericTypeParameters，如果不是，则比对 classTemplateArgCodes，转换为 T0, T1 等 */
  isSchemaNameAst: boolean;
}

/** ast 转换为标准泛型类型
 * @returns 标准泛型类型
 */
export function parseOAS2Ast2PontJsonSchema(
  ast: AstNode,
  context: OAS2JsonSchemaContext
): PontxJsonSchema {
  const { name, templateArgs } = ast;
  let schema = {} as any as PontxJsonSchema;

  if (PRIMITIVE_TYPES.includes(name)) {
    schema.type = name as any;
  } else if (context.schemaNames?.includes(name)) {
    schema.$ref = `#/definitions/${name}`;
  } else if (PrimitiveTypeMap[name]) {
    schema = PrimitiveTypeMap[name];
  }

  // 如果是数据结构名称的 AST，则需要将泛型参数转换为 genericTypeParameters
  if (context.isSchemaNameAst) {
    const genericTypeParameters = templateArgs.map((arg, index) => {
      return {
        name: "T" + index,
        default: parseOAS2Ast2PontJsonSchema(arg, {
          ...context,
          isSchemaNameAst: false,
        }),
      };
    });
    return {
      type: "generic",
      genericTypeParameters,
    };
  } else if (templateArgs?.length) {
    // 如果是子属性类型中的 AST，则需要将泛型参数转换为 genericRef
    const typeArgs = templateArgs.map((arg) => {
      return parseOAS2Ast2PontJsonSchema(arg, context);
    });
    const genericRef = {
      typeArguments: typeArgs,
    } as GenericRef;

    if (schema.type && !schema.$ref) {
      genericRef.name = schema.type;
    } else if (schema.$ref) {
      genericRef.$ref = schema.$ref;
    }

    const resultSchema = {
      type: "generic",
      genericRef,
    } as PontxJsonSchema;

    const schemaCode = PontxJsonSchema.toString(resultSchema);
    if (context.classTemplateArgCodes?.includes(schemaCode)) {
      const index = context.classTemplateArgCodes.indexOf(schemaCode);

      return {
        type: "generic",
        genericTypeParameterRef: `T${index}`,
      };
    }

    return resultSchema;
  }

  const schemaCode = PontxJsonSchema.toString(schema);
  if ((context.classTemplateArgCodes || []).includes(schemaCode)) {
    const index = context.classTemplateArgCodes.indexOf(schemaCode);

    return {
      type: "generic",
      genericTypeParameterRef: `T${index}`,
    };
  }

  return schema;
}

export function parseOAS2JsonSchema(
  schema: PontxJsonSchema,
  context: OAS2JsonSchemaContext
): PontxJsonSchema {
  let resultSchema = schema as PontxJsonSchema;

  resultSchema = PontxJsonSchema.mapPontxSchema(resultSchema, (struct) => {
    if (PrimitiveTypeMap[struct?.type]) {
      return {
        ...struct,
        ...PrimitiveTypeMap[struct?.type],
      };
    }

    return struct;
  });

  resultSchema = PontxJsonSchema.mapPontxSchema(resultSchema, (struct) => {
    if (struct?.$ref) {
      const ast = compileTemplate(struct.$ref, "#/definitions/");
      if (!ast?.templateArgs) {
        return struct;
      }

      return parseOAS2Ast2PontJsonSchema(ast, {
        isSchemaNameAst: false,
        classTemplateArgCodes: context.classTemplateArgCodes,
        schemaNames: context.schemaNames,
      });
    }
    return struct;
  });

  resultSchema = PontxJsonSchema.mapSchemaRequiredToArray(resultSchema);

  return resultSchema;
}
