import * as PontSpec from "pontx-spec";
import { indentation, needQuotationMark } from "../utils";
import * as _ from "lodash";

export const getSchemaInitValue = (schema: PontSpec.PontJsonSchema) => {
  if (!schema) {
    return null;
  }

  if (schema.typeName === "Array") {
    return "[]";
  }

  if (schema.isDefsType) {
    return `new ${schema.typeName}()`;
  }

  if (schema.templateIndex > -1) {
    return "undefined";
  }

  if (schema.enum && schema.enum.length) {
    const str = schema.enum[0];

    if (typeof str === "string") {
      return `'${str}'`;
    }

    return str + "";
  }

  if (schema.typeName === "string") {
    return "''";
  }

  if (schema.typeName === "boolean") {
    return "false";
  }

  return "undefined";
};

export const generateBaseClassJsCode = (schema: PontSpec.PontJsonSchema, name: string) => {
  const propsCode = _.map(schema?.properties, (prop, propName) => {
    return `${needQuotationMark(propName) ? `'${propName}'` : propName} = ${getSchemaInitValue(
      prop as PontSpec.PontJsonSchema,
    )};`;
  }).join("\n");
  const formattedProps = indentation(2)(propsCode);

  return `class ${name} {\n${formattedProps}\n}`;
};
