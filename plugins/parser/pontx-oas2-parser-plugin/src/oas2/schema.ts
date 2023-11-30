import { OAS2 } from "oas-spec-ts";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { JsonSchemaContext, PrimitiveTypeMap, PRIMITIVE_TYPES } from "./utils";
import * as PontSpec from "pontx-spec";
import * as _ from "lodash";

export function parseJsonSchema(schema: OAS2.SchemaObject, context = new JsonSchemaContext()): PontSpec.PontJsonSchema {
  const { items, $ref, type, additionalProperties, properties, required, ...rest } = schema;
  const { required: contextRequied, ...commonContext } = context;

  let reTypeName = PrimitiveTypeMap[type as any]?.type;
  let resultSchema = {
    ...rest,
    type,
    required: contextRequied,
  } as PontSpec.PontJsonSchema;

  if (reTypeName) {
    resultSchema.type = reTypeName;
  }

  if ($ref) {
    const ast = compileTemplate(
      $ref,
      context.compileTemplateKeyword || JsonSchemaContext.defaultCompileTemplateKeyword,
    );

    if (!ast) {
      const result = new PontSpec.PontJsonSchema();
      result.$ref = $ref;
      return result;
    }

    const { typeName, templateArgs, type: refType } = parseAst2PontJsonSchema(ast, context);
    console.assert(
      context.defNames.includes(typeName) || PRIMITIVE_TYPES.includes(typeName || refType),
      "$ref not valid",
    );
    if (refType) {
      resultSchema.type = refType as any;
    }
    if (typeName) {
      resultSchema.typeName = typeName;
    }
    resultSchema.templateArgs = templateArgs;
    resultSchema.$ref = $ref;
  } else if (type === "array" && items) {
    resultSchema = {
      ...resultSchema,
      items: parseJsonSchema(items, commonContext),
    } as PontSpec.PontJsonSchema;
  } else if (type === "object" && properties) {
    resultSchema = {
      ...resultSchema,
      properties: _.mapValues(properties, (value, key) => {
        return parseJsonSchema(value, { ...commonContext, required: required?.includes(key) });
      }),
    } as PontSpec.PontJsonSchema;
  } else if (additionalProperties) {
    resultSchema = {
      ...resultSchema,
      additionalProperties: parseJsonSchema(schema.additionalProperties, commonContext),
    } as PontSpec.PontJsonSchema;
  }

  JsonSchemaContext.handleContext(context, resultSchema);
  return resultSchema;
}
