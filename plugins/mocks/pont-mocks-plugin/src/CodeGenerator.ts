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

function useString(str: string) {
  return `'${str}'`;
}

export class MocksGenerator {
  spec: PontSpec.PontSpec;

  options = {
    defaults: {
      arrayLength: 3,
      string: "string",
      boolean: "true",
    },
  };

  generateJsonSchemaMocks(
    schema: PontSpec.PontJsonSchema,
    options: {
      useJSON: boolean;
      tempalteArgs: PontSpec.PontJsonSchema[];
    } = null,
  ) {
    if (schema.templateIndex !== -1) {
      if (options?.tempalteArgs?.length) {
        return this.generateJsonSchemaMocks(options.tempalteArgs[schema.templateIndex], options);
      }
    }

    if (schema.typeName === "Array") {
      if (schema.templateArgs?.length) {
        const item = this.generateJsonSchemaMocks(schema.templateArgs[0]);
        return `[ ${makeArray(this.options.defaults.arrayLength)
          .map(() => item)
          .join(",")}]`;
      }
      return "[]";
    }
    if (schema.isDefsType) {
      const baseClass = this.spec.baseClasses.find((bs) => bs.name === schema.typeName);

      if (!baseClass) {
        return "{}";
      }

      if (options?.useJSON) {
        return this.generateJsonSchemaMocks(baseClass.schema, {
          useJSON: true,
          tempalteArgs: baseClass.schema.templateArgs,
        });
      }

      return `new Models.${baseClass.name}(${schema.templateArgs
        .map((arg) => this.generateJsonSchemaMocks(arg))
        .join(", ")})`;
    }
    if (schema.enum?.length) {
      if (schema.type === "string") {
        return useString(schema.enum[0]);
      }
      return schema.enum[0];
    }
    switch (schema.type) {
      case "string": {
        return useString(this.options.defaults.string);
      }
      case "number": {
        return Math.random() * 100 + "";
      }
      case "boolean": {
        return this.options.defaults.boolean;
      }
      case "array": {
      }
      case "object": {
      }
    }
  }

  //   generateParameterTsCode(parameter: PontSpec.Parameter) {
  //     const optionalSignal = parameter?.required ? "" : "?";

  //     let name = parameter.name;
  //     if (!name.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
  //       name = `'${name}'`;
  //     }

  //     const fieldTypeDeclaration = `${optionalSignal}: ${this.generateJsonSchemaCode(parameter.schema)}`;
  //     const desc = parameter.schema?.description ? `/** ${parameter.schema?.description} */\n` : "";

  //     return `${desc}${name}${fieldTypeDeclaration};`;
  //   }

  //   genereateAPIRequestParamsTsCode(api: PontSpec.Interface): string {
  //     const bodyParamSchema = api.parameters?.find((param) => param.in === "body")?.schema;
  //     const bodyParamCode = bodyParamSchema ? this.generateJsonSchemaCode(bodyParamSchema) : "";
  //     return bodyParamCode ? `params: Params, bodyParams: ${bodyParamCode}` : `params: Params`;
  //   }

  //   generateAPIParametersTsCode(api: PontSpec.Interface): string {
  //     const normalParams = api.parameters.filter((param) => param.in === "path" || param.in === "query");

  //     if (!api.parameters?.length) {
  //       return "class Params { }";
  //     }

  //     return `class Params {
  // ${indentation(2)(normalParams.map((param) => this.generateParameterTsCode(param)).join("\n"))}
  // }
  //     `;
  //   }

  //   generateAPITsCode(api: PontSpec.Interface): string {
  //     return apiTsTemplate(api, this);
  //   }

  //   generateAPIJsCode(api: PontSpec.Interface): string {
  //     return apiJsTemplate(api);
  //   }

  //   generateModJsCode(mod: PontSpec.Mod): string {
  //     return modJsTemplate(mod, this);
  //   }

  //   generateModTsCode(mod: PontSpec.Mod): string {
  //     return modTsTemplate(mod, this);
  //   }

  //   generateBaseClassesTsCode(spec: PontSpec.PontSpec): string {
  //     if (spec.name) {
  //       return `
  // declare namespace defs {
  //   export namespace ${spec.name} {
  // ${indentation(4)(spec.baseClasses.map((baseClass) => this.generateBaseClassTsCode(baseClass)).join("\n\n"))}
  //   }
  // }`;
  //     }
  //     return `
  // export namespace ${spec.name} {
  // ${indentation(2)(spec.baseClasses.map((baseClass) => this.generateBaseClassTsCode(baseClass)).join("\n\n"))}
  // }`;
  //   }

  //   generateSpecIndexTsCode(spec: PontSpec.PontSpec): string {
  //     return `${this.generateBaseClassesTsCode(spec)}

  // ${this.generateModsIndexTsCode(spec)}
  //     `;
  //   }

  //   generateSpecIndexJsCode(spec: PontSpec.PontSpec): string {
  //     return `export { ${spec.name} } from './mods/index';`;
  //   }

  //   generateSpecsIndexJsCode(specs: PontSpec.PontSpec[]): string {
  //     return `${specs.map((spec) => `import { ${spec.name} } from './${spec.name}';`).join("\n")}

  // window.API = {
  // ${indentation(2)(specs.map((spec) => spec.name).join(",\n"))}
  // };
  //     `;
  //   }

  //   generateModsIndexJsCode(spec: PontSpec.PontSpec): string {
  //     return modsIndexJsTemplate(spec);
  //   }

  //   generateModsIndexTsCode(spec: PontSpec.PontSpec): string {
  //     if (spec.name) {
  //       return `declare namespace API {
  // ${indentation(2)(modsIndexTsTemplate(spec, this))}
  // }`;
  //     }
  //     return modsIndexTsTemplate(spec, this);
  //   }

  //   generateBaseClassTsCode(baseClass: PontSpec.BaseClass) {
  //     const propsCode = _.map(baseClass.schema?.properties, (prop, propName) => {
  //       const propDesc = prop.description || prop.title;
  //       const descCode = propDesc ? `/** ${propDesc} */\n` : "";
  //       return `${descCode}${propName}${
  //         baseClass.schema.required?.includes(propName) ? "" : "?"
  //       }: ${this.generateJsonSchemaCode(prop as any)};`;
  //     }).join("\n");
  //     const formattedProps = indentation(2)(propsCode);

  //     if (baseClass.schema?.templateArgs?.length) {
  //       return `class ${baseClass.name}<${baseClass.schema?.templateArgs
  //         .map((_, index) => `T${index} = any`)
  //         .join(", ")}> {\n${formattedProps}\n}`;
  //     }
  //     return `class ${baseClass.name} {\n${formattedProps}\n}`;
  //   }
}
