import { InnerOriginConfig, PontGeneratorPlugin, PontManager } from "pont-manager";
import { Interface, PontSpec } from "pont-spec";
import * as path from "path";
import { CodeGenerator, FileGenerator, FileStructure, indentation, Snippet } from "pont-generate-core";

class MyCodeGenerator extends CodeGenerator {
  generateAPITsCode(api: Interface): string {
    return `/**
 * ${api.description}
 * ${api.path}
 */
export namespace ${api.name} {
	type HooksParams = (() => Params) | Params;
	function mutate(params?: HooksParams, newValue?: any, shouldRevalidate?: boolean);

${indentation(2)(`export ${this.generateAPIParametersTsCode(api)}`)}
	export type Response = ${this.generateJsonSchemaCode(api.responses?.[200]?.schema)};
	export function request(${this.genereateAPIRequestParamsTsCode(api)}): Promise<Response>;
	export function ${
    api.method?.toUpperCase() === "GET" ? "useRequest" : "useDeprecatedRequest"
  }(params?: HooksParams, options?: ConfigInterface): { isLoading: boolean; data: Response, error: Error, mutate: typeof mutate };
}`;
  }

  generateSpecIndexTsCode(spec: PontSpec): string {
    return `type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
	[key in Key]: Value;
};

declare type ConfigInterface = import("swr").ConfigInterface;

${super.generateSpecIndexTsCode(spec)}`;
  }
}

class PontReactHooksGeneratorPlugin extends PontGeneratorPlugin {
  static generateSingleSpec(pontSpec: PontSpec, basePath: string) {
    const fileStructure = FileStructure.constructorFromCodeGenerator(pontSpec, new MyCodeGenerator());
    const fileGenerator = {
      basePath,
      fileStructure,
    } as FileGenerator;

    return FileGenerator.generateFiles(fileGenerator);
  }

  static generateSpecs(pontSpecs: PontSpec[], basePath: string) {
    const fileStructure = FileStructure.constructorSpecsFromCodeGenerator(pontSpecs, new MyCodeGenerator());
    const fileGenerator = {
      basePath,
      fileStructure,
    } as FileGenerator;

    return FileGenerator.generateFiles(fileGenerator);
  }

  async apply(manager: PontManager, options?: any) {
    let baseDir = manager.innerManagerConfig.outDir;

    if (baseDir.startsWith("./") || baseDir.startsWith("../")) {
      baseDir = path.join(manager.innerManagerConfig.configDir, manager.innerManagerConfig.outDir);
    }

    if (manager.localPontSpecs?.length > 1 && manager.localPontSpecs.every((spec) => spec.name)) {
      manager.logger.info("开始生成多源类型代码");
      await PontReactHooksGeneratorPlugin.generateSpecs(manager.localPontSpecs, baseDir);
      return;
    }

    return PontReactHooksGeneratorPlugin.generateSingleSpec(manager.localPontSpecs[0], baseDir);
  }

  providerSnippets(api: Interface, modName: string, originName = ""): Snippet[] {
    const apiName = originName ? `API.${originName}.${modName}.${api.name}` : `API.${modName}.${api.name}`;

    const isGet = api?.method?.toUpperCase() === "GET";

    return [
      {
        name: "useRequest",
        code: `const { data, isLoading, error } = ${apiName}.useRequest({ });`,
      },
      {
        name: "request promise",
        code: `${apiName}.request({}).then(data => {

  }, err => {

  })`,
      },
      {
        name: "request async",
        code: `try {
    const result = await ${apiName}.request({ });
  } catch (err) {

  }`,
      },
    ];
  }
}

export default PontReactHooksGeneratorPlugin;
