import * as PontSpec from "pontx-spec";
import { indentation, needQuotationMark } from "../utils";
import * as _ from "lodash";

export const apiComment = (api: PontSpec.PontAPI) => {
  const path = api.path ? `\n * ${api.method?.toUpperCase?.() || ""} ${api.path}` : "";
  let desc = api.description ? `\n * ${api.description.split("\n").join("\n * ")}` : "";
  const title = api.title && api.title !== desc ? `\n * @title: ${api.title}` : "";
  const summary = api.summary && api.summary !== desc ? `\n * @summary: ${api.summary}` : "";
  const deprecated = api.deprecated ? `\n * @deprecated` : "";

  if (api?.externalDocs?.url) {
    let externalComment = api.externalDocs.description
      ? `@see ${api.externalDocs.description} ${api.externalDocs.url}`
      : `@see ${api.externalDocs.url}`;

    if (desc) {
      desc = `${desc}\n * ${externalComment}`;
    } else {
      desc = `\n * ${externalComment}`;
    }
  }

  if (!path && !desc && !title && !summary && !deprecated) {
    return "";
  }

  return `/**${path}${desc}${summary || title}${deprecated}\n */\n`;
};

export const generateSchemaCode = (schema: PontSpec.PontJsonSchema, specName?: string) => {
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
    const typeScriptTypeNameMap = {
      array: "Array",
    };
    let defName = schema.typeName
      ? `defs.${specName ? `${specName}.${schema.typeName}` : schema.typeName}`
      : (schema.type as string);

    if (typeScriptTypeNameMap[defName]) {
      defName = typeScriptTypeNameMap[defName];
    }

    if (schema.templateArgs?.length) {
      return `${defName}<${schema.templateArgs.map((arg) => generateSchemaCode(arg, specName)).join(", ")}>`;
    }
    return defName;
  }

  let typeName = schema.typeName;

  if (!typeName && schema.$ref) {
    const seps = schema.$ref?.split("/");
    const lastSep = seps[seps.length - 1];
    if (lastSep) {
      typeName = lastSep;
    }
  }

  switch (schema?.type || typeName) {
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
        return `Array<${generateSchemaCode(schema.items as PontSpec.PontJsonSchema, specName)}>`;
      }

      return "[]";
    }
    case "object": {
      if (schema?.properties) {
        return `{\n${indentation(2)(
          Object.keys(schema.properties)
            .map((propName) => {
              let key = needQuotationMark(propName) ? `'${propName}'` : propName;
              const struct = schema.properties?.[key];
              const desc = struct?.description || struct?.title;
              let comment = "";
              if (desc) {
                comment = `/** ${desc} */\n`;
              }
              if (!struct?.required) {
                key = key + "?";
              }
              return `${comment}${key}: ${generateSchemaCode(
                schema.properties?.[propName] as PontSpec.PontJsonSchema,
                specName,
              )}`;
            })
            .join(";\n"),
        )} }`;
      }
    }
  }

  if (typeName) {
    const defName = `defs.${specName ? `${specName}.${typeName}` : typeName}`;
    return defName;
  }
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    if (refName) {
      return `defs.${specName ? `${specName}.${refName}` : refName}`;
    }
  }

  return schema?.type || "any";
};

export const generateParametersTsCode = (api: PontSpec.PontAPI, specName = "", useClass = true) => {
  const getParameterCode = (parameter: PontSpec.Parameter) => {
    const optionalSignal = parameter?.required ? "" : "?";

    let name = parameter.name;
    if (needQuotationMark(name)) {
      name = `'${name}'`;
    }

    const fieldTypeDeclaration = `${optionalSignal}: ${generateSchemaCode(parameter.schema, specName)}`;
    const descStr = parameter.schema?.description || parameter.schema?.title;
    const desc = descStr && descStr !== parameter.name ? `/** ${descStr} */\n` : "";

    return `${desc}${name}${fieldTypeDeclaration};`;
  };

  const normalParams = api.parameters.filter((param) => param.in === "path" || param.in === "query");

  if (!normalParams?.length) {
    if (useClass) {
      return "class Params { }";
    } else {
      return "type Params = {}";
    }
  }

  return `${useClass ? "class Params" : "type Params ="} {
${indentation(2)(normalParams.map((param) => getParameterCode(param)).join("\n"))}
}`;
};

export const generateClassComment = (schema: PontSpec.PontJsonSchema, name: string) => {
  const docs = ["title", "description"]
    .filter((key) => schema[key] && schema[key] !== name)
    .map((key) => ` * @${key} ${schema[key]}`);
  const classComment = docs?.length ? `/**\n${docs.join("\n")}\n */\n` : "";
  return classComment;
};

export const generateBaseClassTsCode = (schema: PontSpec.PontJsonSchema, name: string, useClass = false) => {
  const propsCode = _.map(schema?.properties, (prop, propName) => {
    const propDesc = prop.description || prop.title;
    const descCode = propDesc ? `/** ${propDesc} */\n` : "";
    const schemaCode = generateSchemaCode(prop as any);
    return `${descCode}${needQuotationMark(propName) ? `'${propName}'` : propName}${
      prop.required ? "" : "?"
    }: ${schemaCode};`;
  }).join("\n");
  const formattedProps = indentation(2)(propsCode);

  if (useClass) {
    if (schema?.templateArgs?.length) {
      return `class ${name}<${schema?.templateArgs
        .map((_, index) => `T${index} = any`)
        .join(", ")}> {\n${formattedProps}\n}`;
    }
    return `class ${name} {\n${formattedProps}\n}`;
  }

  if (schema?.templateArgs?.length) {
    return `type ${name}<${schema?.templateArgs
      .map((_, index) => `T${index} = any`)
      .join(", ")}> = {\n${formattedProps}\n}`;
  }
  return `type ${name} = {\n${formattedProps}\n}`;
};

export const generateApiRequestCode = (api: PontSpec.PontAPI, specName: string) => {
  const bodyParam = api.parameters?.find((param) => param.in === "body");
  if (bodyParam) {
    const bodyParamSchema = bodyParam?.schema;
    const bodyParamType = generateSchemaCode(bodyParamSchema, specName);
    return `(params: Params, bodyParams: ${bodyParamType}, options?: RequestInit): Promise<APIResponse>`;
  }

  return `(params: Params, options?: any): Promise<APIResponse>`;
};
