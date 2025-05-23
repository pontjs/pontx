import { OAS3 } from "oas-spec-ts";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { JsonSchemaContext, PrimitiveTypeMap, PRIMITIVE_TYPES } from "./utils";
import * as PontSpec from "pontx-spec";
import _ from "lodash";

export function parseJsonSchema(schema: OAS3.SchemaObject, context = new JsonSchemaContext()): PontSpec.PontJsonSchema {
  const { items, $ref, type, additionalProperties, properties, required, examples, ...rest } = schema;
  const { required: contextRequied, ...commonContext } = context;

  let reTypeName = PrimitiveTypeMap[type as any]?.type;
  let resultSchema = {
    ...rest,
    type,
    required: contextRequied as any,
  } as PontSpec.PontJsonSchema;

  if (reTypeName) {
    resultSchema.type = reTypeName;
  }
  if (examples) {
    resultSchema.enum = Object.keys(examples);
    const exampleInsts = Object.values(examples).filter(
      (example) => example?.value !== example?.description && example?.description,
    );
    if (exampleInsts.length) {
      resultSchema.enumValueTitles = exampleInsts.reduce((result, exampleInst) => {
        return {
          ...result,
          [exampleInst.value]: exampleInst.description,
        };
      }, {});
    }
  }

  if ($ref) {
    const ast = compileTemplate(
      $ref,
      context.compileTemplateKeyword || JsonSchemaContext.defaultCompileTemplateKeyword,
    );

    if (!ast) {
      return new PontSpec.PontJsonSchema();
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
      resultSchema.originRef = $ref;
      resultSchema.$ref = "#/definitions/" + typeName;
      resultSchema.typeName = typeName;
    }
    resultSchema.templateArgs = templateArgs;
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
