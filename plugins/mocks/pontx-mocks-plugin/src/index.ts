import { PontxMocksPlugin, PontManager, requireTsFile, requireUncached } from "pontx-manager";
import { indentation, generateFiles } from "pontx-generate";
import * as PontxSpec from "pontx-spec";
import * as jsf from "json-schema-faker";
import * as fp from "lodash/fp";
import * as _ from "lodash";
import * as path from "path";
import { requireModule } from "pontx-manager/lib/config";
import * as ts from "typescript";
import { mapPromiseValues } from "./utils";

export const TYPE_TS = `
export type APIMocks<API extends { request: any }> = API["request"];

export type ControllerMocks<Controller extends { [x: string]: any }> = {
  [K in keyof Controller]?: APIMocks<Controller[K]>;
};
`;

export type MocksOptions = {
  schemaMapper?: Function;
  mocksDataMapper?: Function;
};

export class DefaultPontxMocksPlugin extends PontxMocksPlugin {
  getOptions(manager: PontManager, options) {
    const schemaMapperFile = options?.schemaMapper;
    const mocksOptions: MocksOptions = {
      schemaMapper: (id) => id,
      mocksDataMapper: (value) => value,
    };

    if (schemaMapperFile) {
      const schemaMapperModule = requireModule(
        schemaMapperFile,
        manager.innerManagerConfig.configDir,
        manager.innerManagerConfig.rootDir,
      );
      mocksOptions.schemaMapper = schemaMapperModule?.default;
    }
    return mocksOptions;
  }

  async getPreMocksData(manager: PontManager, options?: any) {
    try {
      const mocksPath = path.join(manager.innerManagerConfig.outDir, "mocks/index.ts");

      const program = ts.createProgram([mocksPath], {
        outDir: path.join(manager.innerManagerConfig.rootDir, "node_modules/.pontx/mocks"),
        rootDir: path.join(manager.innerManagerConfig.outDir, "mocks"),
        noEmit: false,
        target: ts.ScriptTarget.ES2015,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        experimentalDecorators: true,
        allowJs: true,
      });

      program.emit();

      const compiledFilePath = path.join(manager.innerManagerConfig.rootDir, "node_modules/.pontx/mocks/index.js");
      const currentMocksIndex = requireUncached(compiledFilePath);
      const currentMocksData = await mapPromiseValues(
        _.mapValues(currentMocksIndex, (mod) => {
          return mapPromiseValues(
            _.mapValues(mod, (api) => {
              if (typeof api === "function") {
                return api();
              }
              return mapPromiseValues(
                _.mapValues(api, (mocks) => {
                  return mocks();
                }),
              );
            }),
          );
        }),
      );
      return currentMocksData;
    } catch (e) {
      console.log(e.stack);
    }
  }

  async apply(manager: PontManager, options?: any) {
    try {
      const mocksOptions = this.getOptions(manager, options);
      const currentMocksData = await this.getPreMocksData(manager, options);

      DefaultPontxMocksPlugin.generateMocksCode(manager, mocksOptions, currentMocksData);
    } catch (e) {
      console.log(e.stack);
      this.logger.error(e.message);
    }
  }

  async getAPIMockCode(
    manager: PontManager,
    options: any,
    apiName: string,
    modName: string,
    specName: string,
  ): Promise<string> {
    const mocksOptions = this.getOptions(manager, options);
    const spec = manager.localPontSpecs?.find((spec) => spec.name === specName);
    const oas3Spec = transformSchema(buildOas3Spec(spec), mocksOptions.schemaMapper);
    const generator = new MocksCodeGenerator(oas3Spec, mocksOptions);
    const namespacePath = oas3Spec?.name ? `API.${oas3Spec.name}.${modName}` : `API.${modName}`;

    const api = oas3Spec?.apis?.[`${modName}/${apiName}`];

    return [
      `export const ${api.name}: typeof ${namespacePath}.${api.name}.request = async (params) => {`,
      `  return ${generator.generateAPIMocksCode(modName, api, 4)};`,
      `};`,
    ].join("\n");
  }

  static getFileStructure(manager: PontManager, options: MocksOptions, mocksData: any) {
    if (manager.localPontSpecs.length === 1 && !manager.localPontSpecs[0].name) {
      return DefaultPontxMocksPlugin.getSpecFileStructure(manager.localPontSpecs[0], options, mocksData);
    }
    if (manager.localPontSpecs.length >= 1) {
      const result = manager.localPontSpecs
        .map((spec) => DefaultPontxMocksPlugin.getSpecFileStructure(spec, options, mocksData?.[spec.name]))
        .reduce((pre, curr) => {
          return { ...pre, ...curr };
        }, {});
      result["index.ts"] = manager.localPontSpecs
        .map((spec) => {
          return `export * as ${spec.name} from './${spec.name}/index';`;
        })
        .join("\n");
      return result;
    }
    return {};
  }

  static getSpecFileStructure(spec: PontxSpec.PontSpec, options: MocksOptions, mocksData: any) {
    const oas3Spec = transformSchema(buildOas3Spec(spec), options.schemaMapper);
    const generator = new MocksCodeGenerator(oas3Spec, options, mocksData);
    const specStructure = {
      ["index.ts"]: generator.generateSpecIndexCode(),
    };
    const mods = PontxSpec.PontSpec.getMods(oas3Spec);
    mods.forEach((mod) => {
      if (typeof mod.name === "string") {
        specStructure[mod.name] = generator.generateModMocksCode(mod);
      } else {
        specStructure["mod"] = generator.generateModMocksCode(mod);
      }
    });
    if (oas3Spec.name) {
      return { [oas3Spec.name]: specStructure };
    }
    return specStructure;
  }

  static async generateMocksCode(manager: PontManager, options: MocksOptions, mocksData: any) {
    const fileStructure = DefaultPontxMocksPlugin.getFileStructure(manager, options, mocksData);

    await generateFiles(fileStructure, path.join(manager.innerManagerConfig.outDir, "mocks"));
  }
}

class MocksCodeGenerator {
  constructor(private oas3Spec: PontxSpec.PontSpec, private options: MocksOptions, private preMocksData?: any) {
    if (!options.schemaMapper) {
      this.options.schemaMapper = (schema) => schema;
    }
  }

  generateSpecIndexCode() {
    const mods = PontxSpec.PontSpec.getMods(this.oas3Spec);

    return mods
      .map((mod) => {
        return `export * as ${mod.name} from './${mod.name}';`;
      })
      .join("\n");
  }

  generateSchemaMocksData(schema: PontxSpec.PontJsonSchema) {
    const mocksSchema = { definitions: this.oas3Spec.definitions, ...schema };
    try {
      jsf.JSONSchemaFaker.option("failOnInvalidFormat", false);
      const result = jsf.JSONSchemaFaker.generate(mocksSchema as any);
      return result;
    } catch (e) {
      debugger;
    }
  }

  generateAPIMocksCode(modName: string, api: PontxSpec.PontAPI, indentationCnt = 4) {
    const schema = api?.responses?.["200"]?.schema;
    let mocksData = null;
    if (!this.preMocksData && schema) {
      mocksData = this.generateSchemaMocksData(schema);
    } else if (this.preMocksData) {
      mocksData = _.get(this.preMocksData, `${modName}.${api.name}`);
    } else {
      return "";
    }

    const mocksCode = JSON.stringify(mocksData, null, 2);
    return indentation(indentationCnt)(mocksCode).trimStart();
  }

  generateModMocksCode(mod: PontxSpec.Mod) {
    const namespace = mod.name;
    const namespacePath = this.oas3Spec?.name ? `API.${this.oas3Spec.name}.${namespace}` : `API.${namespace}`;

    if (mod.interfaces.length) {
      const apiFiles = mod.interfaces
        .map((api) => {
          return [
            `export const ${api.name}: typeof ${namespacePath}.${api.name}.request = async (params) => {`,
            `  return ${this.generateAPIMocksCode(mod.name as string, api, 4)};`,
            `};`,
          ].join("\n");
        })
        .reduce((result, code, index) => {
          return {
            ...result,
            [mod.interfaces[index].name + ".ts"]: code,
          };
        }, {});

      return {
        "index.ts": mod.interfaces.map((api) => `export * from './${api.name}';`).join("\n"),
        ...apiFiles,
      };
    }
  }
}

const buildOas3Spec = (spec: PontxSpec.PontSpec) => {
  const newDefs = {};

  const transformOas2Schema = (schema: PontxSpec.PontJsonSchema) => {
    const { originRef, templateArgs, typeName, ...rest } = schema;

    if (schema.templateArgs?.length && schema?.typeName && spec.definitions?.[schema.typeName] && schema?.originRef) {
      const defSchema = spec.definitions[schema.typeName];
      const newDef = PontxSpec.PontJsonSchema.mapPontxSchema(defSchema, (childSchema) => {
        if (childSchema?.templateIndex !== -1 && typeof childSchema?.templateIndex === "number") {
          return schema.templateArgs[childSchema.templateIndex];
        }
        return childSchema;
      });
      newDefs[schema?.originRef] = newDef;
      return {
        $ref: "#/definitions/" + schema.originRef,
        ...rest,
      };
    }
    return schema;
  };

  const allApis = _.mapValues(spec.apis, (api, apiName) => {
    const apiResponse = api.responses?.[200]?.schema;

    const newApiResponse = PontxSpec.PontJsonSchema.mapPontxSchema(apiResponse, transformOas2Schema);
    return fp.set("responses.200.schema", newApiResponse, api);
  });
  const allDefs = { ...spec.definitions, ...newDefs };
  const newAllDefs = _.mapValues(allDefs, (defSchema, defName) => {
    return PontxSpec.PontJsonSchema.mapPontxSchema(defSchema, (childSchema) => {
      if (childSchema === defSchema) {
        return defSchema;
      }
      return transformOas2Schema(childSchema);
    });
  });
  return {
    ...spec,
    apis: allApis,
    definitions: newAllDefs,
  };
};

const transformSchema = (spec: PontxSpec.PontSpec, schemaMapper: Function) => {
  const newDefs = {};
  const refTransformer = (isTopLevel: boolean) => (schema: PontxSpec.PontJsonSchema) => {
    const { originRef, templateArgs, typeName, ...rest } = schema;
    if (isTopLevel) {
      return schema;
    }

    if (typeName) {
      return {
        ...rest,
        $ref: "#/definitions/" + schema.typeName,
      };
    }
    return schema;
  };
  const requiredTransformer = (schema: PontxSpec.PontJsonSchema) => {
    if (schema.properties && !schema.required) {
      return {
        ...schema,
        required: Object.keys(schema.properties),
      };
    }
    return schema;
  };
  const schemaTransformer = (isTopLevel: boolean) => (schema: PontxSpec.PontJsonSchema) => {
    const transformers = [
      refTransformer(isTopLevel),
      requiredTransformer,
      (schema) => {
        if (schema.properties && !schema.additionalProperties) {
          return {
            ...schema,
            additionalProperties: false,
          };
        }
        return schema;
      },
      schemaMapper,
    ];

    return transformers.reduce((result, transformer) => {
      return transformer(result);
    }, schema);
  };

  const allApis = _.mapValues(spec.apis, (api, apiName) => {
    const apiResponse = api.responses?.[200]?.schema;

    const newApiResponse = PontxSpec.PontJsonSchema.mapPontxSchema(apiResponse, schemaTransformer(false));
    return fp.set("responses.200.schema", newApiResponse, api);
  });
  const allDefs = { ...spec.definitions, ...newDefs };
  const newAllDefs = _.mapValues(allDefs, (defSchema, defName) => {
    return PontxSpec.PontJsonSchema.mapPontxSchema(defSchema, (childSchema) => {
      if (childSchema === defSchema) {
        return schemaTransformer(true)(defSchema);
      }
      return schemaTransformer(false)(childSchema);
    });
  });
  return {
    ...spec,
    apis: allApis,
    definitions: newAllDefs,
  };
};

export default DefaultPontxMocksPlugin;
