import * as fs from "fs-extra";
import * as _ from "lodash";
import * as PontSpec from "pont-spec";
import { CodeGenerator } from "./CodeGenerator";
import prettier from "prettier";

export class FileStructure {
  [fileName: string]: string | FileStructure;

  static async generateFiles(fileStructure: FileStructure, basePath: string) {
    const promises = _.map(fileStructure, async (value: string | {}, name) => {
      const currPath = `${basePath}/${name}`;

      if (typeof value === "string") {
        return fs.writeFile(currPath, value, "utf8");
      } else {
        await fs.mkdir(currPath);

        return this.generateFiles(value, currPath);
      }
    });

    return Promise.all(promises);
  }

  static constructorFromCodeGenerator<T extends CodeGenerator>(
    spec: PontSpec.PontSpec,
    generator: T = new CodeGenerator() as any,
  ): FileStructure {
    generator.specName = spec.name;
    const mods = spec.mods.reduce((result, mod) => {
      return { ...result, [mod.name + ".js"]: generator.generateModJsCode(mod) };
    }, {} as FileStructure);
    mods["index.js"] = generator.generateModsIndexJsCode(spec);

    return {
      "index.d.ts": generator.generateSpecIndexTsCode(spec),
      "api-lock.json": generator.generateLockCode(spec),
      mods,
      "index.js": generator.generateSpecIndexJsCode(spec),
    };
  }

  static constructorSpecsFromCodeGenerator<T extends CodeGenerator>(
    specs: PontSpec.PontSpec[],
    generator: T = new CodeGenerator() as any,
  ): FileStructure {
    const specsFiles = specs.reduce((result, spec) => {
      return {
        ...result,
        [spec.name]: FileStructure.constructorFromCodeGenerator(spec, generator),
      };
    }, {});

    return {
      ...specsFiles,
      ["index.js"]: generator.generateSpecsIndexJsCode(specs),
      ["index.d.ts"]: specs.map((spec) => `/// <reference path="./${spec.name}/index.d.ts" />`).join("\n"),
    };
  }

  static async applyFormat(fileStructure: FileStructure, options: prettier.Options) {
    return Object.keys(fileStructure || {}).reduce((result, filename) => {
      const value = fileStructure[filename];

      if (typeof value === "string") {
        return {
          ...result,
          [filename]: prettier.format(value, options),
        };
      } else {
        return {
          ...result,
          [filename]: FileStructure.applyFormat(value, options),
        };
      }
    }, {} as FileStructure);
  }
}

export class FileGenerator {
  basePath = "";
  fileStructure: FileStructure;

  static clearBasePath(fileGenerator: FileGenerator) {
    const isExists = fs.existsSync(fileGenerator.basePath);
    if (isExists) {
      return fs.removeSync(fileGenerator.basePath);
    }
  }

  static async generateFiles(fileGenerator: FileGenerator) {
    FileGenerator.clearBasePath(fileGenerator);
    await fs.mkdir(fileGenerator.basePath);
    await FileStructure.generateFiles(fileGenerator.fileStructure, fileGenerator.basePath);
  }

  // todo 按需增量重新生成文件，类似 React DOM diff
  static async regenerateFiles(fileGenerator: FileGenerator) {}
}
