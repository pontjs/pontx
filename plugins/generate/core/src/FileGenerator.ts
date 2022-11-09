import * as fs from "fs-extra";
import * as _ from "lodash";
import * as PontSpec from "pontx-spec";
import { CodeGenerator } from "./CodeGenerator";
import prettier from "prettier";
import { clearPath } from "./utils";
import * as path from "path";

export class FileStructure {
  [fileName: string]: string | FileStructure;

  static async generateFiles(fileStructure: FileStructure, basePath: string) {
    const promises = _.map(fileStructure, async (value: string | {}, name) => {
      const currPath = `${basePath}/${name}`;

      if (typeof value === "string") {
        return fs.writeFile(currPath, value, "utf8");
      } else {
        await fs.mkdirp(currPath);

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

    const mods = PontSpec.PontSpec.getMods(spec).reduce((result, mod) => {
      const modName = typeof mod.name === "string" ? mod.name : "main";
      return { ...result, [modName + ".js"]: generator.generateModJsCode(mod) };
    }, {} as FileStructure);
    mods["index.js"] = generator.generateModsIndexJsCode(spec);

    return {
      "index.d.ts": generator.generateSpecIndexTsCode(spec),
      "api-lock.json": generator.generateLockCode(spec),
      "baseClasses.js": generator.generateBaseClassesJsCode(spec),
      mods,
      "index.js": generator.generateSpecIndexJsCode(spec),
    };
  }

  static constructorSpecsFromCodeGenerator<T extends CodeGenerator>(
    specs: PontSpec.PontSpec[],
    generator: T = new CodeGenerator() as any,
  ): FileStructure {
    const specsFiles = specs.reduce((result, spec) => {
      const hasMod = PontSpec.PontSpec.checkHasMods(spec);
      return {
        ...result,
        [spec.name]: hasMod
          ? FileStructure.constructorFromCodeGenerator(spec, generator)
          : NoModFileStructure.constructorFromCodeGenerator(spec, generator),
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
export class NoModFileStructure {
  [fileName: string]: string | NoModFileStructure;

  static constructorFromCodeGenerator<T extends CodeGenerator>(
    spec: PontSpec.PontSpec,
    generator: T = new CodeGenerator() as any,
  ): NoModFileStructure {
    generator.specName = spec.name;

    return {
      "index.d.ts": generator.generateSpecIndexTsCode(spec),
      "api-lock.json": generator.generateLockCode(spec),
      "baseClasses.js": generator.generateBaseClassesJsCode(spec),
      [generator.specName + ".js"]: generator.generateModsIndexJsCode(spec),
      "index.js": generator.generateSpecIndexJsCode(spec),
    };
  }
}

export class FileGenerator {
  basePath = "";
  fileStructure: FileStructure;

  static async generateWrapper(fileGenerator: FileGenerator) {
    if (fs.existsSync(fileGenerator.basePath)) {
      if (fs.existsSync(fileGenerator.basePath + "/.gitignore")) {
        return;
      }
      fs.writeFileSync(fileGenerator.basePath + "/.gitignore", ".mocks\n.remote\n.local", "utf8");
      return;
    }

    await fs.mkdirp(fileGenerator.basePath);
    fs.writeFileSync(fileGenerator.basePath + "/.gitignore", ".mocks\n.remote\n.local", "utf8");
  }

  static async generateFiles(fileGenerator: FileGenerator) {
    clearPath(fileGenerator.basePath);
    await fs.mkdirp(fileGenerator.basePath);
    await FileStructure.generateFiles(fileGenerator.fileStructure, fileGenerator.basePath);
  }

  static async generateSdk(fileGenerator: FileGenerator) {
    await FileGenerator.generateWrapper(fileGenerator);
    const sdkPath = fileGenerator.basePath + "/sdk";

    clearPath(sdkPath);
    await fs.mkdirp(sdkPath);
    await FileStructure.generateFiles(fileGenerator.fileStructure, sdkPath);
  }

  static async generateRemoteCache(outDir: string, specs: PontSpec.PontSpec[]) {
    if (specs?.length && specs.some((spec) => spec.name)) {
      const struct = {};
      specs.forEach((spec) => {
        struct[spec.name + ".json"] = JSON.stringify(spec, null, 2);
      });

      return FileGenerator.generateFiles({
        basePath: path.join(outDir, ".remote"),
        fileStructure: struct,
      });
    } else if (specs.length) {
      return fs.writeFile(path.join(outDir, ".remote"), JSON.stringify(specs, null, 2), "utf8");
    }
  }

  static regenerateSingleLocaleSpec(spec: PontSpec.PontSpec, pontPath: string) {
    FileStructure.generateFiles(FileGenerator.generateLocalSpec(spec), path.join(pontPath, ".locale"));
  }

  static regenerateLocaleSpecs(specs: PontSpec.PontSpec[], pontPath: string) {
    const structure = {};
    specs.forEach((spec) => {
      structure[spec.name] = FileGenerator.generateLocalSpec(spec);
    });
    FileStructure.generateFiles(structure, path.join(pontPath, ".locale"));
  }
  static generateLocalSpec(spec: PontSpec.PontSpec) {
    const mods = PontSpec.PontSpec.getMods(spec);
    const specFiles = { definitions: spec.definitions };
    const hasMods = PontSpec.PontSpec.checkHasMods(spec);

    if (hasMods) {
      mods.forEach((mod) => {
        const modFiles = {};
        mod.interfaces.forEach((api) => {
          modFiles[api.name] = api;
        });

        if (typeof mod.name === "string") {
          specFiles[mod.name] = modFiles;
        } else {
          specFiles["main"] = modFiles;
        }
      });
    } else {
      specFiles["apis"] = spec.apis;
    }

    return specFiles;
  }

  // todo 按需增量重新生成文件，类似 React DOM diff
  static async regenerateFiles(fileGenerator: FileGenerator) {}
}
