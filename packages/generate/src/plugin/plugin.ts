import * as _ from "lodash";
import * as fs from "fs-extra";
import * as PontSpec from "pontx-spec";
import { PontAPI } from "pontx-spec";
import { InnerOriginConfig, PontInnerManagerConfig, PontManager, PontxGeneratorPlugin, Snippet } from "pontx-manager";
import { clearPath } from "../utils";
import * as path from "path";

export type FileStructure = {
  [fileName: string]: string | FileStructure;
};

export async function _generateFiles(fileStructure: FileStructure, basePath: string) {
  const promises = _.map(fileStructure, async (value: string | {}, name) => {
    const currPath = path.join(basePath, name);

    if (typeof value === "string") {
      return fs.writeFile(currPath, value, "utf8");
    } else {
      await fs.mkdirp(currPath);

      return _generateFiles(value, currPath);
    }
  });

  return Promise.all(promises);
}

export async function generateSDKWrapper(fileStructure: FileStructure, basePath: string) {
  if (fs.existsSync(basePath)) {
    if (fs.existsSync(basePath + "/.gitignore")) {
      return;
    }
    fs.writeFileSync(basePath + "/.gitignore", ".mocks\n.remote\n.local", "utf8");
    return;
  }

  await fs.mkdirp(basePath);
  fs.writeFileSync(basePath + "/.gitignore", ".mocks\n.remote\n.local", "utf8");
}

export async function generateFiles(fileStructure: FileStructure, basePath: string) {
  clearPath(basePath);
  await fs.mkdirp(basePath);
  await _generateFiles(fileStructure, basePath);
}

export async function generateRemoteCache(outDir: string, specs: PontSpec.PontSpec[]) {
  if (specs?.length && specs.some((spec) => spec?.name)) {
    const struct = {};
    specs.forEach((spec) => {
      if (spec?.name) {
        struct[spec.name + ".json"] = JSON.stringify(spec, null, 2);
      }
    });

    return generateFiles(struct, path.join(outDir, ".remote"));
  }
}

export async function generateSdk(fileStructure: FileStructure, basePath: string) {
  await generateSDKWrapper(fileStructure, basePath);
  const sdkPath = basePath + "/sdk";

  clearPath(sdkPath);
  await fs.mkdirp(sdkPath);
  await generateFiles(fileStructure, sdkPath);
}

export type GetFilesBySpecs = (
  origins: Array<{
    spec: PontSpec.PontSpec;
    name: string;
    conf: InnerOriginConfig;
  }>,
  options?: any,
) => Promise<FileStructure>;
export type GetFilesBySingleSpec = (
  spec: PontSpec.PontSpec,
  conf: PontInnerManagerConfig,
  options?: any,
) => Promise<FileStructure>;

export type SnippetsProvider = (info: {
  api: PontAPI;
  controllerName: string;
  originName: string;
  options?: any;
}) => Snippet[];

export type ControllerSnippetsProvider = (info: {
  controller: PontSpec.Mod;
  controllerName: string;
  originName: string;
  options?: any;
}) => Snippet[];

export { PontxGeneratorPlugin };

export const createPontxGeneratePlugin = (
  provider: {
    getFilesBySpecs?: GetFilesBySpecs;
    getFilesBySginleSpec?: GetFilesBySingleSpec;
    snippetsProvider?: SnippetsProvider;
    controllerSnippetsProvider?: ControllerSnippetsProvider;
  } = { snippetsProvider: () => [] },
) => {
  const { getFilesBySginleSpec, getFilesBySpecs, snippetsProvider, controllerSnippetsProvider } = provider;
  return class StandardPontxGeneratePlugin extends PontxGeneratorPlugin {
    origins = [] as Array<{
      spec: PontSpec.PontSpec;
      name: string;
    }>;

    providerSnippets(api: PontSpec.PontAPI, controllerName: string, originName: string, options?: any): Snippet[] {
      return snippetsProvider({
        api,
        controllerName,
        originName,
        options,
      });
    }

    providerControllerSnippets(controllerName: string, originName: string, options?: any): Snippet[] {
      const spec = options?.spec;

      if (!spec) {
        return [];
      }

      const mods = PontSpec.PontSpec.getMods(spec);
      const mod = mods?.find((mod) => mod?.name === controllerName);
      if (!mod) {
        return [];
      }

      if (!controllerSnippetsProvider) {
        return [];
      }

      return controllerSnippetsProvider({
        controller: mod,
        controllerName,
        originName,
        options,
      });
    }

    async apply(manager: PontManager, options?: any) {
      let baseDir = manager.innerManagerConfig.outDir;
      const origins = (manager.innerManagerConfig.origins || [])
        .map((conf) => {
          return {
            name: conf.name,
            conf,
            spec: manager.localPontSpecs?.find((spec) => spec?.name === conf.name),
          };
        })
        .filter((origin) => origin.spec && origin.name);
      this.origins = origins;

      try {
        if (
          manager.innerManagerConfig.multiple &&
          manager.localPontSpecs?.length >= 1 &&
          manager.localPontSpecs.every((spec) => spec.name)
        ) {
          manager.logger.info("开始生成代码");

          const fileStructure = await getFilesBySpecs(origins, options);
          return generateSdk(fileStructure, baseDir);
        }

        const fileStructure = await getFilesBySginleSpec(
          manager.localPontSpecs[0],
          manager.innerManagerConfig,
          options,
        );
        return generateSdk(fileStructure, baseDir);
      } catch (e) {
        manager.logger.error({
          message: e.message,
          processType: "generate",
          stack: e.stack,
        });
      }
    }
  };
};
