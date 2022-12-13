import * as _ from "lodash";
import * as fs from "fs-extra";
import * as PontSpec from "pontx-spec";
import { PontAPI } from "pontx-spec";
import { InnerOriginConfig, PontInnerManagerConfig, PontManager, PontxGeneratorPlugin, Snippet } from "pontx-manager";
import { clearPath } from "./utils";

export type FileStructure = {
  [fileName: string]: string | FileStructure;
};

export async function _generateFiles(fileStructure: FileStructure, basePath: string) {
  const promises = _.map(fileStructure, async (value: string | {}, name) => {
    const currPath = `${basePath}/${name}`;

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
) => Promise<FileStructure>;
export type GetFilesBySingleSpec = (spec: PontSpec.PontSpec, conf: PontInnerManagerConfig) => Promise<FileStructure>;

export type SnippetsProvider = (info: {
  api: PontAPI;
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
  } = { snippetsProvider: () => [] },
) => {
  const { getFilesBySginleSpec, getFilesBySpecs, snippetsProvider } = provider;
  return class StandardPontxGeneratePlugin extends PontxGeneratorPlugin {
    providerSnippets(api: PontSpec.PontAPI, controllerName: string, originName: string, options?: any): Snippet[] {
      return snippetsProvider({
        api,
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

      try {
        if (manager.localPontSpecs?.length >= 1 && manager.localPontSpecs.every((spec) => spec.name)) {
          manager.logger.info("开始生成代码");

          const fileStructure = await getFilesBySpecs(origins);
          return generateSdk(fileStructure, baseDir);
        }

        const fileStructure = await getFilesBySginleSpec(manager.localPontSpecs[0], manager.innerManagerConfig);
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
