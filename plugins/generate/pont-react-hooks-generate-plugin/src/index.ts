import { InnerOriginConfig, PontGeneratorPlugin, PontManager } from "pont-manager";
import { PontAPI, PontSpec } from "pont-spec";
import * as path from "path";
import * as fs from "fs-extra";
import { CodeGenerator, FileGenerator, FileStructure, indentation, Snippet } from "pont-generate-core";

async function getBuiltinStructure() {
  const builtinStructure = {};
  const dir = await fs.readdir(path.join(__dirname, "../builtin"));
  const promises = dir.map(async (filename) => {
    const content = await fs.readFile(path.join(__dirname, "../builtin", filename));

    return {
      content,
      name: filename,
    };
  });
  const files = await Promise.all(promises);
  files.forEach((file) => {
    builtinStructure[file.name] = file.content;
  });

  return builtinStructure;
}

class MyCodeGenerator extends CodeGenerator {
  generateAPITsCode(api: PontAPI): string {
    return `/**
 * ${api.description}
 * ${api.path}${api.deprecated ? "\n * @deprecated" : ""}
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

  generateSpecsIndexJsCode(specs: PontSpec[]): string {
    const originCode = super.generateSpecsIndexJsCode(specs);
    return `import { processSpecs } from "./builtin/process";\n${originCode}\nprocessSpecs();\n`;
  }

  generateSpecIndexJsCode(spec: PontSpec): string {
    const originCode = super.generateSpecIndexJsCode(spec);
    return `import { processSingleSpec } from "./builtin/process";\n${originCode}\nprocessSingleSpec();\n`;
  }
}

class PontReactHooksGeneratorPlugin extends PontGeneratorPlugin {
  static async generateSingleSpec(pontSpec: PontSpec, basePath: string) {
    const fileStructure = FileStructure.constructorFromCodeGenerator(pontSpec, new MyCodeGenerator());
    fileStructure["builtin"] = await getBuiltinStructure();

    const fileGenerator = {
      basePath,
      fileStructure,
    } as FileGenerator;

    return FileGenerator.generateFiles(fileGenerator);
  }

  static async generateSpecs(pontSpecs: PontSpec[], basePath: string) {
    const fileStructure = FileStructure.constructorSpecsFromCodeGenerator(pontSpecs, new MyCodeGenerator());
    fileStructure["builtin"] = await getBuiltinStructure();
    const fileGenerator = {
      basePath,
      fileStructure,
    } as FileGenerator;

    return FileGenerator.generateFiles(fileGenerator);
  }

  async apply(manager: PontManager, options?: any) {
    let baseDir = manager.innerManagerConfig.outDir;

    try {
      if (baseDir.startsWith("./") || baseDir.startsWith("../")) {
        baseDir = path.join(manager.innerManagerConfig.configDir, manager.innerManagerConfig.outDir);
      }

      if (manager.localPontSpecs?.length > 1 && manager.localPontSpecs.every((spec) => spec.name)) {
        manager.logger.info("开始生成多源类型代码");
        return PontReactHooksGeneratorPlugin.generateSpecs(manager.localPontSpecs, baseDir);
      }

      return PontReactHooksGeneratorPlugin.generateSingleSpec(manager.localPontSpecs[0], baseDir);
    } catch (e) {
      manager.logger.error({
        message: e.message,
        processType: "generate",
        stack: e.stack,
      });
    }
  }

  providerSnippets(api: PontAPI, modName: string, originName = ""): Snippet[] {
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
