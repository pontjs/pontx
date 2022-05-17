import { OAS2 } from "oas-spec-ts";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { JsonSchemaContext, PrimitiveTypeMap } from "./utils";
import * as PontSpec from "pont-spec";
import * as _ from "lodash";

export function parseJsonSchema(schema: OAS2.SchemaObject, context = new JsonSchemaContext()): PontSpec.PontJsonSchema {
  const { items, $ref, type, additionalProperties, properties } = schema;

  let resultSchema = {
    ...schema,
    typeName: PrimitiveTypeMap[type as any] || type,
  } as PontSpec.PontJsonSchema;

  if ($ref) {
    const ast = compileTemplate($ref, context.compileTemplateKeyword);

    if (!ast) {
      return new PontSpec.PontJsonSchema();
    }

    resultSchema = parseAst2PontJsonSchema(ast, context);
    resultSchema.isDefsType = context.defNames.includes(resultSchema.typeName);
  } else if (type === "array" && items) {
    resultSchema = {
      ...resultSchema,
      items: parseJsonSchema(items, context),
    } as PontSpec.PontJsonSchema;
  } else if (type === "object" && properties) {
    resultSchema = {
      ...resultSchema,
      properties: _.mapValues(properties, (value, key) => {
        return parseJsonSchema(value, context);
      }),
    } as PontSpec.PontJsonSchema;
  } else if (additionalProperties) {
    resultSchema = {
      ...resultSchema,
      additionalProperties: parseJsonSchema(schema.additionalProperties, context),
    } as PontSpec.PontJsonSchema;
  }

  JsonSchemaContext.handleContext(context, resultSchema);
  return resultSchema;
}
