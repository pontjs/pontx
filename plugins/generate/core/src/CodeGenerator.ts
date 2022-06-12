import * as PontSpec from "pont-spec";
import * as _ from "lodash";

const makeArray = (cnt: number) => Array.from(new Array(cnt));
const indentationLine = (cnt: number) => (line: string) =>
  line?.length
    ? makeArray(cnt)
        .map(() => " ")
        .join("") + line
    : "";
export const indentation = (cnt = 2) => {
  return (code: string) => {
    const lines = code?.split("\n") || ([] as string[]);
    return lines.map(indentationLine(cnt)).join("\n");
  };
};

export const needQuotationMark = (name: string) => {
  return !name.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/);
};

export const apiJsTemplate = (inter: PontSpec.Interface) => `${
  inter.description
    ? `/**
 * ${inter.description.split("\n").join("\n * ")}
 */`
    : ""
}
export const ${inter.name} = {
  path: '${inter.path}',
  method: '${inter.method?.toUpperCase()}',
  hasBody: ${inter.parameters.some((param) => param.in === "body")}
};
`;

export const apiTsTemplate = (api: PontSpec.Interface, generator: CodeGenerator) => `/**
 * @path: ${api.path}${
  api.description
    ? `
* ${api.description.split("\n").join("\n * ")}`
    : ""
}
 */
export namespace ${api.name} {
${indentation(2)(`export ${generator.generateAPIParametersTsCode(api)}`)}
  export type Response = ${generator.generateJsonSchemaCode(api.responses["200"]?.schema)};
  export function request(${generator.genereateAPIRequestParamsTsCode(api)}): Promise<Response>;
}
`;

const modJsTemplate = (mod: PontSpec.Mod, generator: CodeGenerator) => `/**
* ${mod.name}${
  mod.description
    ? `
* ${mod.description}`
    : ""
}
*/

${mod.interfaces
  .map((api) => {
    return generator.generateAPIJsCode(api);
  })
  .join("\n")}
`;

const modTsTemplate = (mod: PontSpec.Mod, generator: CodeGenerator) => `
/**
 * ${mod.description}
 * ${mod.name}
 */
export namespace ${mod.name} {
${indentation(2)(mod.interfaces.map((inter) => generator.generateAPITsCode(inter)).join("\n\n"))}
}
`;

const modsIndexJsTemplate = (spec: PontSpec.PontSpec) => `${
  spec.name
    ? `/**
  * @name: ${spec.name}
  */
`
    : ""
}${spec.mods
  .map((mod) => {
    return `import * as ${mod.name} from './${mod.name}';`;
  })
  .join("\n")}

${spec.name ? `export const ${spec.name} =` : "window.API ="} {
  ${spec.mods.map((mod) => mod.name).join(",\n  ")}
};
`;

const modsIndexTsTemplate = (spec: PontSpec.PontSpec, generator: CodeGenerator) => `export namespace ${
  spec.name || "API"
} {
${indentation(2)(
  spec.mods
    .map((mod) => {
      return generator.generateModTsCode(mod);
    })
    .join("\n"),
)}
}
`;

export class CodeGenerator {
  specName = "";

  generateJsonSchemaInitValue(schema: PontSpec.PontJsonSchema) {
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
  }

  generateJsonSchemaCode(schema: PontSpec.PontJsonSchema) {
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
      const defName = schema.isDefsType
        ? `defs.${this.specName ? `${this.specName}.${schema.typeName}` : schema.typeName}`
        : schema.typeName;
      if (schema.templateArgs?.length) {
        return `${defName}<${schema.templateArgs.map((arg) => this.generateJsonSchemaCode(arg)).join(", ")}>`;
      }
      return defName;
    }

    switch (schema?.typeName) {
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
          return `Array<${this.generateJsonSchemaCode(schema.items as PontSpec.PontJsonSchema)}>`;
        }

        return "[]";
      }
      case "object": {
        if (schema?.properties) {
          return `{ ${Object.keys(schema.properties)
            .map((propName) => {
              return `${propName}: ${this.generateJsonSchemaCode(
                schema.properties?.[propName] as PontSpec.PontJsonSchema,
              )}`;
            })
            .join("; ")} }`;
        }
      }
    }

    return schema?.typeName || "any";
  }

  generateParameterTsCode(parameter: PontSpec.Parameter) {
    const optionalSignal = parameter?.required ? "" : "?";

    let name = parameter.name;
    if (needQuotationMark(name)) {
      name = `'${name}'`;
    }

    const fieldTypeDeclaration = `${optionalSignal}: ${this.generateJsonSchemaCode(parameter.schema)}`;
    const desc = parameter.schema?.description ? `/** ${parameter.schema?.description} */\n` : "";

    return `${desc}${name}${fieldTypeDeclaration};`;
  }

  genereateAPIRequestParamsTsCode(api: PontSpec.Interface): string {
    const bodyParamSchema = api.parameters?.find((param) => param.in === "body")?.schema;
    const bodyParamCode = bodyParamSchema ? this.generateJsonSchemaCode(bodyParamSchema) : "";
    return bodyParamCode ? `params: Params, bodyParams: ${bodyParamCode}` : `params: Params`;
  }

  generateAPIParametersTsCode(api: PontSpec.Interface): string {
    const normalParams = api.parameters.filter((param) => param.in === "path" || param.in === "query");

    if (!api.parameters?.length) {
      return "class Params { }";
    }

    return `class Params {
${indentation(2)(normalParams.map((param) => this.generateParameterTsCode(param)).join("\n"))}
}
    `;
  }

  generateAPITsCode(api: PontSpec.Interface): string {
    return apiTsTemplate(api, this);
  }

  generateAPIJsCode(api: PontSpec.Interface): string {
    return apiJsTemplate(api);
  }

  generateModJsCode(mod: PontSpec.Mod): string {
    return modJsTemplate(mod, this);
  }

  generateModTsCode(mod: PontSpec.Mod): string {
    return modTsTemplate(mod, this);
  }

  generateBaseClassesTsCode(spec: PontSpec.PontSpec): string {
    if (spec.name) {
      return `
declare namespace defs {
  export namespace ${spec.name} {
${indentation(4)(spec.baseClasses.map((baseClass) => this.generateBaseClassTsCode(baseClass)).join("\n\n"))}
  }
}`;
    }
    return `
export namespace defs {
${indentation(2)(spec.baseClasses.map((baseClass) => this.generateBaseClassTsCode(baseClass)).join("\n\n"))}
}`;
  }

  generateBaseClassesJsCode(spec: PontSpec.PontSpec): string {
    const clsCodes = spec.baseClasses.map((base) => this.generateBaseClassJsCode(base));

    if (this.specName) {
      return `${clsCodes.join("\n\n")}
export const ${this.specName} = {
  ${spec.baseClasses.map((bs) => bs.name).join(",\n  ")}
}
      `;
    }

    return clsCodes.map((cls) => `export ${cls}`).join("\n\n");
  }

  generateSpecIndexTsCode(spec: PontSpec.PontSpec): string {
    return `${this.generateBaseClassesTsCode(spec)}

${this.generateModsIndexTsCode(spec)}
    `;
  }

  generateSpecIndexJsCode(spec: PontSpec.PontSpec): string {
    if (!spec.name) {
      return `import './mods/index';
import * as defs from './baseClasses';

window.defs = defs;
`;
    }

    return `import { ${spec.name} } from './mods/index';
import { ${spec.name} as baseClasses } from './baseClasses';

if (window.API) {
  window.API.${spec.name} = ${spec.name};
} else {
  window.API = { ${spec.name} };
}

if (window.defs) {
  window.defs.${spec.name} = baseClasses;
} else {
  window.defs = { ${spec.name}: baseClasses };
}
`;
  }

  generateSpecsIndexJsCode(specs: PontSpec.PontSpec[]): string {
    return `${specs.map((spec) => `import './${spec.name}/index';`).join("\n")}\n`;
  }

  generateModsIndexJsCode(spec: PontSpec.PontSpec): string {
    return modsIndexJsTemplate(spec);
  }

  generateModsIndexTsCode(spec: PontSpec.PontSpec): string {
    if (spec.name) {
      return `declare namespace API {
${indentation(2)(modsIndexTsTemplate(spec, this))}
}`;
    }
    return modsIndexTsTemplate(spec, this);
  }

  generateBaseClassJsCode(baseClass: PontSpec.BaseClass) {
    const propsCode = _.map(baseClass.schema?.properties, (prop, propName) => {
      return `${propName} = ${this.generateJsonSchemaInitValue(prop as PontSpec.PontJsonSchema)};`;
    }).join("\n");
    const formattedProps = indentation(2)(propsCode);

    return `class ${baseClass.name} {\n${formattedProps}\n}`;
  }

  generateBaseClassTsCode(baseClass: PontSpec.BaseClass) {
    const propsCode = _.map(baseClass.schema?.properties, (prop, propName) => {
      const propDesc = prop.description || prop.title;
      const descCode = propDesc ? `/** ${propDesc} */\n` : "";
      return `${descCode}${needQuotationMark(propName) ? `'${propName}'` : propName}${
        baseClass.schema.required?.includes(propName) ? "" : "?"
      }: ${this.generateJsonSchemaCode(prop as any)};`;
    }).join("\n");
    const formattedProps = indentation(2)(propsCode);

    if (baseClass.schema?.templateArgs?.length) {
      return `class ${baseClass.name}<${baseClass.schema?.templateArgs
        .map((_, index) => `T${index} = any`)
        .join(", ")}> {\n${formattedProps}\n}`;
    }
    return `class ${baseClass.name} {\n${formattedProps}\n}`;
  }

  generateLockCode(spec: PontSpec.PontSpec) {
    return JSON.stringify(spec, null, 2);
  }
}
