import _ from "lodash";
import { PontxJsonSchema } from "../../schema.js";
import { indentation, checkNeedQuotationMark } from "../utils.js";
import { PontxSpec } from "../../spec.js";
import { generateSchemaComment } from "../comment.js";

export const generateSchemaCode = (
  schema: PontxJsonSchema,
  schemaPrefix?: string
) => {
  if (schema?.type === "string" && schema.format === "binary") {
    return "Blob";
  }

  switch (schema?.type) {
    case "array": {
      if (schema.items) {
        return `Array<${generateSchemaCode(
          schema.items as PontxJsonSchema,
          schemaPrefix
        )}>`;
      }

      return "[]";
    }
    case "object": {
      if (schema?.properties) {
        const propsCode = indentation(2)(
          Object.keys(schema.properties)
            .map((propName) => {
              let key = checkNeedQuotationMark(propName)
                ? `'${propName}'`
                : propName;
              const struct = schema.properties?.[propName];
              const comment = generateSchemaComment(struct);
              if (!PontxJsonSchema.checkRequired(schema, propName)) {
                key = key + "?";
              }

              return `${comment}${key}: ${generateSchemaCode(
                schema.properties?.[propName] as PontxJsonSchema,
                schemaPrefix
              )}`;
            })
            .join(";\n")
        );

        return `{\n${propsCode}\n}`;
      }

      if (schema?.additionalProperties) {
        return `Record<any, ${generateSchemaCode(
          schema?.additionalProperties as PontxJsonSchema,
          schemaPrefix
        )}>`;
      }
    }
  }

  return PontxJsonSchema.toString(schema, schemaPrefix);
};

export function generateGenericTypeParameters(schema: PontxJsonSchema) {
  if (schema?.genericTypeParameters?.length) {
    return `<${schema?.genericTypeParameters
      .map((typeParam, index) => {
        if (typeof typeParam === "string") {
          return `${typeParam} = any`;
        }
        return `${typeParam.name} = ${generateSchemaCode(typeParam.default)}`;
      })
      .join(", ")}>`;
  }

  return "";
}

export const generateBaseClassTsCode = (
  schema: PontxJsonSchema,
  name: string,
  useClass = false
) => {
  const propsCode = _.map(schema?.properties, (prop, propName) => {
    const comment = generateSchemaComment(prop as PontxJsonSchema);
    const schemaCode = generateSchemaCode(prop as any);

    let key = checkNeedQuotationMark(propName) ? `'${propName}'` : propName;
    if (!PontxJsonSchema.checkRequired(schema, propName)) {
      key = key + "?";
    }

    return `${comment}${key}: ${schemaCode};`;
  }).join("\n");
  const formattedProps = indentation(2)(propsCode);

  if (useClass) {
    if (schema?.genericTypeParameters?.length) {
      const genericParamsCode = generateGenericTypeParameters(schema);
      return `class ${name}${genericParamsCode} {\n${formattedProps}\n}`;
    }
    return `class ${name} {\n${formattedProps}\n}`;
  }

  if (schema?.genericTypeParameters?.length) {
    const genericParamsCode = generateGenericTypeParameters(schema);
    return `type ${name}${genericParamsCode} = {\n${formattedProps}\n}`;
  }

  return `type ${name} = {\n${formattedProps}\n}`;
};

/** 生成所有 schema 的类型定义代码 */
export function generateSchemas(spec: PontxSpec) {
  const schemas = spec.components.schemas;

  const code = _.map(schemas, (schema, name) => {
    const schemaComment = generateSchemaComment(schema, name);

    if (schema.type === "object" && schema.properties) {
      return `${schemaComment}export ${generateBaseClassTsCode(
        schema,
        name,
        false
      )}`;
    }

    const genericParamsCode = generateGenericTypeParameters(schema);
    return `${schemaComment}export type ${name}${genericParamsCode} = ${generateSchemaCode(
      schema
    )}`;
  }).join("\n\n");

  return code;
}
